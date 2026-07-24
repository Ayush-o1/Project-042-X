import { describe, it, expect } from 'vitest';
import { isGitHubRepoUrl, normalizeGitHubUrl } from '../RemoteRepositoryFetcher';
import { InvalidRepositoryUrlError } from '../../errors/RepositoryErrors';

describe('isGitHubRepoUrl', () => {
  it('accepts plain owner/repo GitHub HTTPS URLs', () => {
    expect(isGitHubRepoUrl('https://github.com/expressjs/express')).toBe(true);
  });

  it('accepts a trailing .git suffix and trailing slash', () => {
    expect(isGitHubRepoUrl('https://github.com/expressjs/express.git')).toBe(true);
    expect(isGitHubRepoUrl('https://github.com/expressjs/express/')).toBe(true);
  });

  it('rejects non-GitHub hosts', () => {
    expect(isGitHubRepoUrl('https://gitlab.com/owner/repo')).toBe(false);
    expect(isGitHubRepoUrl('https://evil.com/github.com/owner/repo')).toBe(false);
  });

  it('rejects a URL with credentials, query strings, or a subpath', () => {
    expect(isGitHubRepoUrl('https://user:pass@github.com/owner/repo')).toBe(false);
    expect(isGitHubRepoUrl('https://github.com/owner/repo?tab=readme')).toBe(false);
    expect(isGitHubRepoUrl('https://github.com/owner/repo/tree/main')).toBe(false);
  });

  it('rejects a plain local absolute path', () => {
    expect(isGitHubRepoUrl('/Users/me/some-repo')).toBe(false);
  });

  it('rejects non-https schemes', () => {
    expect(isGitHubRepoUrl('git@github.com:owner/repo.git')).toBe(false);
    expect(isGitHubRepoUrl('http://github.com/owner/repo')).toBe(false);
  });
});

describe('normalizeGitHubUrl', () => {
  it('normalizes owner/repo, owner/repo/, and owner/repo.git to the same clone URL', () => {
    const expected = 'https://github.com/expressjs/express.git';
    expect(normalizeGitHubUrl('https://github.com/expressjs/express')).toBe(expected);
    expect(normalizeGitHubUrl('https://github.com/expressjs/express/')).toBe(expected);
    expect(normalizeGitHubUrl('https://github.com/expressjs/express.git')).toBe(expected);
  });

  it('throws InvalidRepositoryUrlError for a non-GitHub URL', () => {
    expect(() => normalizeGitHubUrl('https://gitlab.com/owner/repo')).toThrow(InvalidRepositoryUrlError);
  });
});
