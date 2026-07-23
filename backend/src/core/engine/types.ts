import { FileModel } from '../scanner/types';
import { DependencyGraph } from '../ast/DependencyGraph';
import { GitGraph } from '../git/types';

export interface RepositoryStatistics {
  totalFiles: number;
  totalSize: number;
  totalCommits: number;
  totalBranches: number;
  predominantLanguage: string;
}

export interface UnifiedRepositoryModel {
  path: string;
  name: string;
  statistics: RepositoryStatistics;
  files: FileModel[];
  dependencies: DependencyGraph;
  git: GitGraph;
}
