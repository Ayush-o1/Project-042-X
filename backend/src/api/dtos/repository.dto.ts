import { z } from 'zod';
import * as path from 'path';

const absolutePath = z
  .string()
  .min(1, 'Path cannot be empty')
  .max(4096, 'Path is too long')
  .refine(p => path.isAbsolute(p), 'Path must be absolute');

export const AnalyzeRepositorySchema = z.object({
  body: z.object({
    path: absolutePath,
  }),
});

export const FileContentQuerySchema = z.object({
  query: z.object({
    path: absolutePath,
  }),
});

export type AnalyzeRepositoryDto = z.infer<typeof AnalyzeRepositorySchema>['body'];
export type FileContentQueryDto = z.infer<typeof FileContentQuerySchema>['query'];
