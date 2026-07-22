export class InvalidRepositoryError extends Error {
  constructor(path: string) {
    super(`Invalid Git repository at path: ${path}. Missing .git directory.`);
    this.name = 'InvalidRepositoryError';
  }
}

export class FileSystemAccessError extends Error {
  constructor(path: string, originalError: Error) {
    super(`Failed to access path: ${path}. Reason: ${originalError.message}`);
    this.name = 'FileSystemAccessError';
  }
}

export class FileAccessDeniedError extends Error {
  constructor() {
    super('Access denied: the requested file is not part of the analyzed repository.');
    this.name = 'FileAccessDeniedError';
  }
}

export class NoRepositoryAnalyzedError extends Error {
  constructor() {
    super('No repository has been analyzed yet.');
    this.name = 'NoRepositoryAnalyzedError';
  }
}

export class AnalysisNotFoundError extends Error {
  constructor(analysisId: string) {
    super(`Analysis "${analysisId}" was not found. It may have been evicted; re-run the analysis.`);
    this.name = 'AnalysisNotFoundError';
  }
}
