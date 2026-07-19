import { RepositoryIntelligenceEngine } from '../../core/engine/RepositoryIntelligenceEngine';
import { UnifiedRepositoryModel } from '../../core/engine/types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class RepositoryService {
  private static instance: RepositoryService;
  private engine: RepositoryIntelligenceEngine;
  private cachedModel: UnifiedRepositoryModel | null = null;

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
    
    // Security check: ensure targetPath is within the repository path to prevent path traversal
    const resolvedPath = path.resolve(targetPath);
    if (!resolvedPath.startsWith(repoPath)) {
      throw new Error('Access Denied: Path is outside the analyzed repository.');
    }

    try {
      const content = await fs.readFile(resolvedPath, 'utf-8');
      return content;
    } catch (err: any) {
      throw new Error(`Failed to read file: ${err.message}`);
    }
  }

  private ensureAnalyzed() {
    if (!this.cachedModel) {
      throw new Error('No repository has been analyzed yet.');
    }
  }
}
