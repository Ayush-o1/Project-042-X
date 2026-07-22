export interface FileModel {
  name: string;
  path: string;
  /** Path relative to the repository root (provided by the backend scanner). */
  relativePath?: string;
  isDirectory: boolean;
  size: number;
  extension: string;
  language: string;
  lastModified: number;
}

export interface RepositoryStatistics {
  totalFiles: number;
  totalSize: number;
  totalCommits: number;
  totalBranches: number;
  predominantLanguage: string;
}

export interface RepositoryMetadata {
  path: string;
  name: string;
  statistics: RepositoryStatistics;
}

export interface GraphNode {
  id: string; // Absolute path
  path: string; // Absolute path
  name: string;
  type: string;
  hasSyntaxError?: boolean;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  type: string; // 'static' | 'dynamic'
  isDynamic?: boolean;
  isTypeOnly?: boolean;
}

export interface DependencyGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GitCommitNode {
  hash: string;
  parents: string[];
  author: string;
  authorEmail?: string;
  timestamp: string;
  message: string;
  refs: string[];
  filesChanged: string[];
}

export interface GitGraphData {
  head: string | null;
  commits: GitCommitNode[];
  /** Total commits in the analysis; may exceed commits.length when capped/paginated. */
  totalCommits?: number;
}
