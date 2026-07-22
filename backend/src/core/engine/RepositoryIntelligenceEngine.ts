import { UnifiedRepositoryModel, RepositoryStatistics } from './types';
import { RepositoryScanner } from '../scanner/RepositoryScanner';
import { DependencyExtractionEngine } from '../ast/DependencyExtractionEngine';
import { GitIntelligenceEngine } from '../git/GitIntelligenceEngine';
import { GitGraph } from '../git/types';
import { RepositoryModel } from '../scanner/types';

export interface AnalyzeOptions {
  /**
   * Maximum number of commits to load from git history (newest first).
   * Defaults to DEFAULT_MAX_COMMITS; huge histories otherwise exhaust memory.
   */
  maxCommits?: number;
}

/** Default commit cap — enough for full history on almost all repositories. */
export const DEFAULT_MAX_COMMITS = 20000;

export class RepositoryIntelligenceEngine {
  private scanner: RepositoryScanner;
  private astEngine: DependencyExtractionEngine;
  private gitEngine: GitIntelligenceEngine;

  constructor() {
    this.scanner = new RepositoryScanner();
    this.astEngine = new DependencyExtractionEngine();
    this.gitEngine = new GitIntelligenceEngine();
  }

  /**
   * Orchestrates the complete analysis of a local repository.
   * Combines filesystem, AST, and Git data into a unified model.
   * 
   * @param repoPath Absolute path to the Git repository.
   * @returns The fully unified repository model.
   */
  public async analyze(repoPath: string, options?: AnalyzeOptions): Promise<UnifiedRepositoryModel> {
    const maxCommits = options?.maxCommits ?? DEFAULT_MAX_COMMITS;

    // The filesystem/AST pipeline and the git log run as concurrent async
    // operations (interleaved I/O on the event loop — not separate threads)
    // so neither waits on the other's disk access.
    const fileSystemAndAstPromise = this.processFileSystemAndAst(repoPath);
    const gitPromise = this.gitEngine.analyze(repoPath, maxCommits);

    const [{ repoModel, dependencyGraph }, gitGraph] = await Promise.all([
      fileSystemAndAstPromise,
      gitPromise
    ]);

    const statistics = this.computeStatistics(repoModel, gitGraph);

    return {
      path: repoModel.path,
      name: repoModel.name,
      statistics,
      files: repoModel.files,
      dependencies: dependencyGraph,
      git: gitGraph
    };
  }

  /**
   * Runs the scanner and then feeds the result directly into the AST engine.
   */
  private async processFileSystemAndAst(repoPath: string) {
    const repoModel = await this.scanner.scan(repoPath);
    const dependencyGraph = await this.astEngine.extract(repoModel);
    return { repoModel, dependencyGraph };
  }

  /**
   * Computes high-level statistics across the unified models.
   */
  private computeStatistics(repoModel: RepositoryModel, gitGraph: GitGraph): RepositoryStatistics {
    // Count unique branches
    const branchSet = new Set<string>();
    for (const commit of gitGraph.commits.values()) {
      for (let ref of commit.refs) {
        if (ref.startsWith('HEAD -> ')) {
          ref = ref.substring('HEAD -> '.length).trim();
        }
        if (ref === 'HEAD') continue;
        if (ref.startsWith('tag: ')) continue;
        
        branchSet.add(ref);
      }
    }

    // Determine predominant language
    const languageCounts = new Map<string, number>();
    for (const file of repoModel.files) {
      if (file.language !== 'Unknown') {
        languageCounts.set(file.language, (languageCounts.get(file.language) || 0) + 1);
      }
    }

    let predominantLanguage = 'Unknown';
    let maxCount = 0;
    for (const [lang, count] of languageCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        predominantLanguage = lang;
      }
    }

    return {
      totalFiles: repoModel.totalFiles,
      totalSize: repoModel.totalSize,
      totalCommits: gitGraph.commits.size,
      totalBranches: branchSet.size,
      predominantLanguage,
    };
  }
}
