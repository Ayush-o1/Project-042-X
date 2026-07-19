export class GitRepositoryError extends Error {
  constructor(path: string, message: string) {
    super(`Git error at ${path}: ${message}`);
    this.name = 'GitRepositoryError';
  }
}

export class EmptyGitRepositoryError extends GitRepositoryError {
  constructor(path: string) {
    super(path, 'The repository is empty (no commits yet).');
    this.name = 'EmptyGitRepositoryError';
  }
}
