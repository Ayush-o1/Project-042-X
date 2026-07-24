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

export class InvalidRepositoryUrlError extends Error {
  constructor(url: string) {
    super(`"${url}" is not a public GitHub repository URL that could be cloned. Expected a form like https://github.com/owner/repo.`);
    this.name = 'InvalidRepositoryUrlError';
  }
}

export class RepositoryCloneTimeoutError extends Error {
  constructor(url: string) {
    super(`Timed out cloning ${url}. The repository may be too large or unreachable.`);
    this.name = 'RepositoryCloneTimeoutError';
  }
}

export class RepositoryTooLargeError extends Error {
  constructor(url: string, limitBytes: number) {
    super(`${url} exceeds the ${Math.round(limitBytes / (1024 * 1024))}MB size limit for demo analysis.`);
    this.name = 'RepositoryTooLargeError';
  }
}

export class LocalPathAnalysisDisabledError extends Error {
  constructor() {
    super('This deployment only analyzes public GitHub repository URLs, not local filesystem paths.');
    this.name = 'LocalPathAnalysisDisabledError';
  }
}
