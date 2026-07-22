import { randomUUID } from 'crypto';
import { RepositoryIntelligenceEngine, AnalyzeOptions } from '../../core/engine/RepositoryIntelligenceEngine';
import { UnifiedRepositoryModel } from '../../core/engine/types';
import {
  AnalysisNotFoundError,
  FileAccessDeniedError,
  FileSystemAccessError,
  NoRepositoryAnalyzedError,
} from '../../core/errors/RepositoryErrors';
import * as fs from 'fs/promises';
import * as path from 'path';

interface AnalysisEntry {
  id: string;
  model: UnifiedRepositoryModel;
  /** Exact set of file paths discovered by the scanner — the only files readable via the API. */
  scannedPaths: Set<string>;
  createdAt: number;
}

/** Number of completed analyses kept in memory before evicting the oldest. */
const MAX_CACHED_ANALYSES = 3;

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
    repoPath: string,
    options?: AnalyzeOptions,
  ): Promise<{ analysisId: string; model: UnifiedRepositoryModel }> {
    const model = await this.engine.analyze(repoPath, options);
    const id = randomUUID();
    this.analyses.set(id, {
      id,
      model,
      scannedPaths: new Set(model.files.map(f => f.path)),
      createdAt: Date.now(),
    });
    this.latestId = id;
    this.evictOldest();
    return { analysisId: id, model };
  }

  public getModel(analysisId?: string): UnifiedRepositoryModel {
    return this.getEntry(analysisId).model;
  }

  public getFiles(analysisId?: string) {
    return this.getEntry(analysisId).model.files;
  }

  public getDependencies(analysisId?: string) {
    const model = this.getEntry(analysisId).model;
    return {
      nodes: model.dependencies.getAllNodes(),
      edges: model.dependencies.getAllEdges(),
    };
  }

  /**
   * Returns git history, optionally as a page.
   * Commits are in `git log` order (newest first).
   */
  public getGitData(analysisId?: string, offset = 0, limit?: number) {
    const model = this.getEntry(analysisId).model;
    const all = Array.from(model.git.commits.values());
    const commits = limit !== undefined ? all.slice(offset, offset + limit) : all.slice(offset);
    return {
      head: model.git.head,
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
    let realTarget: string;
    try {
      const realRoot = await fs.realpath(repoPath);
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

  private evictOldest(): void {
    while (this.analyses.size > MAX_CACHED_ANALYSES) {
      let oldest: AnalysisEntry | null = null;
      for (const entry of this.analyses.values()) {
        if (!oldest || entry.createdAt < oldest.createdAt) oldest = entry;
      }
      if (!oldest) break;
      this.analyses.delete(oldest.id);
    }
  }
}
