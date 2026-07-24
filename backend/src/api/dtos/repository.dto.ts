import { z } from 'zod';
import * as path from 'path';
import { isGitHubRepoUrl } from '../../core/scanner/RemoteRepositoryFetcher';

const absolutePath = z
  .string()
  .min(1, 'Path cannot be empty')
  .max(4096, 'Path is too long')
  .refine(p => path.isAbsolute(p), 'Path must be absolute');

// Accepts either shape at the schema level — a local filesystem path or a
// public GitHub repository URL. Which one is actually *allowed* is a
// deployment-mode policy decision (see PUBLIC_DEMO_MODE in
// repository.service.ts), not a request-shape concern, so it's enforced
// one layer up rather than here.
const repositoryTarget = z
  .string()
  .min(1, 'Repository path or URL cannot be empty')
  .max(4096, 'Path or URL is too long')
  .refine(p => path.isAbsolute(p) || isGitHubRepoUrl(p), 'Must be an absolute path or a GitHub repository URL (https://github.com/owner/repo)');

export const AnalyzeRepositorySchema = z.object({
  body: z.object({
    path: repositoryTarget,
    /** Optional cap on git history depth (newest first). */
    maxCommits: z.number().int().positive().max(1_000_000).optional(),
  }),
});

export const FileContentQuerySchema = z.object({
  query: z.object({
    path: absolutePath,
  }),
});

export type AnalyzeRepositoryDto = z.infer<typeof AnalyzeRepositorySchema>['body'];
export type FileContentQueryDto = z.infer<typeof FileContentQuerySchema>['query'];
