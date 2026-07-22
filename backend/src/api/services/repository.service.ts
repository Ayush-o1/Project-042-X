import { RepositoryIntelligenceEngine } from '../../core/engine/RepositoryIntelligenceEngine';
import { UnifiedRepositoryModel } from '../../core/engine/types';
import {
  FileAccessDeniedError,
  FileSystemAccessError,
  NoRepositoryAnalyzedError,
} from '../../core/errors/RepositoryErrors';
import * as fs from 'fs/promises';
import * as path from 'path';

export class RepositoryService {
  private static instance: RepositoryService;
  private engine: RepositoryIntelligenceEngine;
  private cachedModel: UnifiedRepositoryModel | null = null;
  /** Exact set of file paths discovered by the scanner — the only files readable via the API. */
  private scannedPaths: Set<string> = new Set();

  private constructor() {
    this.engine = new RepositoryIntelligenceEngine();
  }

  public static getInstance(): RepositoryService {
    if (!RepositoryService.instance) {
      RepositoryService.instance = new RepositoryService();
    }
    return RepositoryService.instance;
  }

  public async analyzeRepository(repoPath: string): Promise<UnifiedRepositoryModel> {
    const model = await this.engine.analyze(repoPath);
    this.cachedModel = model;
    this.scannedPaths = new Set(model.files.map(f => f.path));
    return model;
  }

  public getModel(): UnifiedRepositoryModel {
    this.ensureAnalyzed();
    return this.cachedModel!;
  }

  public getFiles() {
    this.ensureAnalyzed();
    return this.cachedModel!.files;
  }

  public getDependencies() {
    this.ensureAnalyzed();
    // For JSON serialization, we might need to convert maps/sets if any exist,
    // but the DependencyGraph class exposes arrays via its getters.
    return {
      nodes: this.cachedModel!.dependencies.getAllNodes(),
      edges: this.cachedModel!.dependencies.getAllEdges()
    };
  }

  public getGitData() {
    this.ensureAnalyzed();
    // Maps don't JSON.stringify well, so we convert the commits Map to an array
    const commits = Array.from(this.cachedModel!.git.commits.values());
    return {
      head: this.cachedModel!.git.head,
      commits
    };
  }

  public getStatistics() {
    this.ensureAnalyzed();
    return this.cachedModel!.statistics;
  }

  public async getFileContent(targetPath: string): Promise<string> {
    this.ensureAnalyzed();
    const repoPath = this.cachedModel!.path;
    const resolvedPath = path.resolve(targetPath);

    // 1. Membership check: only files discovered by the scanner may be read.
    //    Scanned entries are regular files (the scanner does not follow symlinks),
    //    so this alone rules out reading .git internals or arbitrary repo-external files.
    if (!this.scannedPaths.has(resolvedPath)) {
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

  private ensureAnalyzed() {
    if (!this.cachedModel) {
      throw new NoRepositoryAnalyzedError();
    }
  }
}
