import { randomUUID } from 'crypto';
import { RepositoryIntelligenceEngine, AnalyzeOptions } from '../../core/engine/RepositoryIntelligenceEngine';
import { UnifiedRepositoryModel } from '../../core/engine/types';
import { GitCommitNode } from '../../core/git/types';
import {
  AnalysisNotFoundError,
  FileAccessDeniedError,
  FileSystemAccessError,
  NoRepositoryAnalyzedError,
  LocalPathAnalysisDisabledError,
} from '../../core/errors/RepositoryErrors';
import { isGitHubRepoUrl, cloneRepositoryForAnalysis, cleanupClonedRepository } from '../../core/scanner/RemoteRepositoryFetcher';
import * as fs from 'fs/promises';
import * as path from 'path';

interface AnalysisEntry {
  id: string;
  model: UnifiedRepositoryModel;
  /** Exact set of file paths discovered by the scanner — the only files readable via the API. */
  scannedPaths: Set<string>;
  createdAt: number;
  /** Set only when this analysis came from a cloned GitHub URL — the temp
   *  directory backing every file this entry can serve. Deleted once the
   *  entry is evicted; kept alive until then since the Code Viewer reads
   *  file contents from disk lazily, well after analyze() has returned. */
  cloneDir?: string;
  /**
   * Lazily-computed, cached real (symlink-resolved) path of `model.path`.
   * The repo root's identity is fixed for this entry's whole lifetime, so
   * this is computed once (on the first getFileContent call) and reused,
   * instead of re-resolving it from disk on every single file open. The
   * per-request *target* path is still realpath'd fresh every time — only
   * the fixed root is cached. Staleness: if the on-disk repo root were
   * deleted and replaced by something else at the same path while this
   * entry is still cached (a few minutes, until LRU eviction), this cached
   * value would miss that swap. That requires local filesystem tampering
   * with the exact path mid-analysis; the target file is still verified
   * fresh on every request regardless, so this only narrows an already
   * extremely unlikely race, it doesn't introduce a new one.
   */
  realRootPromise?: Promise<string>;
  /**
   * Lazily-computed, cached array form of `model.git.commits` (a Map).
   * Staleness: none beyond what already exists — `model.git.commits` is a
   * frozen snapshot taken once during analyze() and never mutated
   * afterward for this entry (confirmed in GitIntelligenceEngine /
   * RepositoryIntelligenceEngine: nothing re-runs `git log` or writes back
   * into an existing entry's model). The old uncached code re-flattened
   * this same frozen snapshot on every call; caching it changes nothing
   * about freshness, only avoids repeating the flatten.
   */
  commitsArray?: GitCommitNode[];
}

/** Number of completed analyses kept in memory before evicting the oldest. */
const MAX_CACHED_ANALYSES = 3;

/** When true, this deployment only analyzes public GitHub URLs — local
 *  filesystem paths are rejected outright. Set on a public deployment
 *  (Render), where accepting an arbitrary path from a browser would let
 *  anyone browse the server's own filesystem. Local development leaves
 *  this unset, unchanged from before remote analysis existed. */
const PUBLIC_DEMO_MODE = process.env.PUBLIC_DEMO_MODE === 'true';

/**
 * Holds completed analyses as addressable resources.
 *
 * Each analysis gets an id returned by POST /analyze; subsequent GETs pass it
 * back so concurrent or interleaved analyses can never serve each other's
 * data. Requests without an id fall back to the most recent analysis, which
 * keeps pre-1.2 clients working.
 */
export class RepositoryService {
  private static instance: RepositoryService;
  private engine: RepositoryIntelligenceEngine;
  private analyses = new Map<string, AnalysisEntry>();
  private latestId: string | null = null;

  private constructor() {
    this.engine = new RepositoryIntelligenceEngine();
  }

  public static getInstance(): RepositoryService {
    if (!RepositoryService.instance) {
      RepositoryService.instance = new RepositoryService();
    }
    return RepositoryService.instance;
  }

  public async analyzeRepository(
    repoTarget: string,
    options?: AnalyzeOptions,
  ): Promise<{ analysisId: string; model: UnifiedRepositoryModel }> {
    const isUrl = isGitHubRepoUrl(repoTarget);
    if (!isUrl && PUBLIC_DEMO_MODE) throw new LocalPathAnalysisDisabledError();

    const cloneDir = isUrl ? await cloneRepositoryForAnalysis(repoTarget) : undefined;
    try {
      const model = await this.engine.analyze(cloneDir ?? repoTarget, options);
      const id = randomUUID();
      this.analyses.set(id, {
        id,
        model,
        scannedPaths: new Set(model.files.map(f => f.path)),
        createdAt: Date.now(),
        cloneDir,
      });
      this.latestId = id;
      await this.evictOldest();
      return { analysisId: id, model };
    } catch (err) {
      // The analysis never made it into the cache, so nothing will evict
      // (and clean up) this clone later — do it now.
      if (cloneDir) await cleanupClonedRepository(cloneDir);
      throw err;
    }
  }

  public getModel(analysisId?: string): UnifiedRepositoryModel {
    return this.getEntry(analysisId).model;
  }

  /**
   * Returns the scanned file list, optionally as a page. `offset`/`limit`
   * are optional — omitting both returns every file, exactly as before, so
   * any consumer that doesn't opt into paging keeps its existing behavior.
   */
  public getFiles(analysisId?: string, offset = 0, limit?: number) {
    const all = this.getEntry(analysisId).model.files;
    const files = limit !== undefined ? all.slice(offset, offset + limit) : all.slice(offset);
    return { files, totalFiles: all.length };
  }

  /**
   * Returns the dependency graph, optionally as a page of nodes. Edges are
   * scoped to whichever nodes are in the returned page (each node's own
   * outgoing edges, via DependencyGraph's existing per-source storage) —
   * every edge's source is always some node in the graph, so fetching every
   * page and concatenating nodes/edges reconstructs the exact same full
   * graph as the old unpaginated response. A page is never "missing" edges
   * that belong to it; an edge may just reference a targetId whose own
   * node hasn't arrived in an earlier/later page yet, same as any
   * paginated graph API.
   */
  public getDependencies(analysisId?: string, offset = 0, limit?: number) {
    const model = this.getEntry(analysisId).model;
    const allNodes = model.dependencies.getAllNodes();
    const nodes = limit !== undefined ? allNodes.slice(offset, offset + limit) : allNodes.slice(offset);
    const edges = nodes.flatMap(n => model.dependencies.getOutgoingEdges(n.id));
    return { nodes, edges, totalNodes: allNodes.length };
  }

  /**
   * Returns git history, optionally as a page.
   * Commits are in `git log` order (newest first).
   */
  public getGitData(analysisId?: string, offset = 0, limit?: number) {
    const entry = this.getEntry(analysisId);
    if (!entry.commitsArray) {
      entry.commitsArray = Array.from(entry.model.git.commits.values());
    }
    const all = entry.commitsArray;
    const commits = limit !== undefined ? all.slice(offset, offset + limit) : all.slice(offset);
    return {
      head: entry.model.git.head,
      commits,
      totalCommits: all.length,
    };
  }

  public getStatistics(analysisId?: string) {
    return this.getEntry(analysisId).model.statistics;
  }

  public async getFileContent(targetPath: string, analysisId?: string): Promise<string> {
    const entry = this.getEntry(analysisId);
    const repoPath = entry.model.path;
    const resolvedPath = path.resolve(targetPath);

    // 1. Membership check: only files discovered by the scanner may be read.
    //    Scanned entries are regular files (the scanner does not follow symlinks),
    //    so this alone rules out reading .git internals or arbitrary repo-external files.
    if (!entry.scannedPaths.has(resolvedPath)) {
      throw new FileAccessDeniedError();
    }

    // 2. Defense in depth: verify the physical file actually lives inside the
    //    repository root, following symlinks on both sides (macOS tmp dirs are
    //    symlinked, e.g. /var -> /private/var, so both must be realpath'd).
    //    The root's realpath is fixed for this entry's lifetime and cached
    //    (see AnalysisEntry.realRootPromise); the target's realpath still
    //    varies per call and is always resolved fresh — never cached.
    let realTarget: string;
    try {
      if (!entry.realRootPromise) {
        entry.realRootPromise = fs.realpath(repoPath);
      }
      let realRoot: string;
      try {
        realRoot = await entry.realRootPromise;
      } catch (rootErr) {
        // Don't cache a rejection — a transient failure here shouldn't
        // permanently poison every future file open for this analysis;
        // let the next call retry fs.realpath(repoPath) fresh.
        entry.realRootPromise = undefined;
        throw rootErr;
      }
      realTarget = await fs.realpath(resolvedPath);
      if (realTarget !== realRoot && !realTarget.startsWith(realRoot + path.sep)) {
        throw new FileAccessDeniedError();
      }
    } catch (err: any) {
      if (err instanceof FileAccessDeniedError) throw err;
      // realpath fails if the file vanished after scanning
      throw new FileSystemAccessError(resolvedPath, err);
    }

    try {
      return await fs.readFile(realTarget, 'utf-8');
    } catch (err: any) {
      throw new FileSystemAccessError(resolvedPath, err);
    }
  }

  private getEntry(analysisId?: string): AnalysisEntry {
    if (analysisId) {
      const entry = this.analyses.get(analysisId);
      if (!entry) throw new AnalysisNotFoundError(analysisId);
      return entry;
    }
    if (!this.latestId) throw new NoRepositoryAnalyzedError();
    const latest = this.analyses.get(this.latestId);
    if (!latest) throw new NoRepositoryAnalyzedError();
    return latest;
  }

  private async evictOldest(): Promise<void> {
    const toClean: string[] = [];
    while (this.analyses.size > MAX_CACHED_ANALYSES) {
      let oldest: AnalysisEntry | null = null;
      for (const entry of this.analyses.values()) {
        if (!oldest || entry.createdAt < oldest.createdAt) oldest = entry;
      }
      if (!oldest) break;
      this.analyses.delete(oldest.id);
      if (oldest.cloneDir) toClean.push(oldest.cloneDir);
    }
    await Promise.all(toClean.map(cleanupClonedRepository));
  }
}
