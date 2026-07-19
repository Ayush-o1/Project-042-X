export interface FileModel {
  name: string;
  path: string;
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
