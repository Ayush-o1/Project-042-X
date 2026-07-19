import { z } from 'zod';

export const AnalyzeRepositorySchema = z.object({
  body: z.object({
    path: z.string().min(1, 'Repository path cannot be empty'),
  }),
});

export const FileContentQuerySchema = z.object({
  query: z.object({
    path: z.string().min(1, 'File path query parameter is required'),
  }),
});

export type AnalyzeRepositoryDto = z.infer<typeof AnalyzeRepositorySchema>['body'];
export type FileContentQueryDto = z.infer<typeof FileContentQuerySchema>['query'];
