import { RepositoryIntelligenceEngine } from '../../core/engine/RepositoryIntelligenceEngine';
import { UnifiedRepositoryModel } from '../../core/engine/types';

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

  private ensureAnalyzed() {
    if (!this.cachedModel) {
      throw new Error('No repository has been analyzed yet.');
    }
  }
}
