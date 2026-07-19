export interface FileModel {
  path: string;
  relativePath: string;
  name: string;
  extension: string;
  language: string;
  sizeBytes: number;
}

export interface RepositoryModel {
  path: string;
  name: string;
  totalFiles: number;
  totalSize: number;
  files: FileModel[];
}

export interface IScannerFilter {
  shouldIgnore(relativePath: string, isDirectory: boolean): boolean;
}
