import { describe, it, expect } from 'vitest';
import { AnalyzeRepositorySchema } from '../repository.dto';

describe('AnalyzeRepositorySchema', () => {
  it('accepts a local absolute path', () => {
    const result = AnalyzeRepositorySchema.safeParse({ body: { path: '/Users/me/repo' } });
    expect(result.success).toBe(true);
  });

  it('accepts a GitHub repository URL', () => {
    const result = AnalyzeRepositorySchema.safeParse({ body: { path: 'https://github.com/expressjs/express' } });
    expect(result.success).toBe(true);
  });

  it('rejects a relative path', () => {
    const result = AnalyzeRepositorySchema.safeParse({ body: { path: './relative/repo' } });
    expect(result.success).toBe(false);
  });

  it('rejects a non-GitHub URL', () => {
    const result = AnalyzeRepositorySchema.safeParse({ body: { path: 'https://gitlab.com/owner/repo' } });
    expect(result.success).toBe(false);
  });

  it('rejects an empty string', () => {
    const result = AnalyzeRepositorySchema.safeParse({ body: { path: '' } });
    expect(result.success).toBe(false);
  });
});
