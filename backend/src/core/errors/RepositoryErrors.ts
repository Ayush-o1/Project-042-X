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
