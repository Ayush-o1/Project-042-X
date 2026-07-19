import { z } from 'zod';

export const AnalyzeRepositorySchema = z.object({
  body: z.object({
    path: z.string().min(1, 'Repository path cannot be empty'),
  }),
});

export type AnalyzeRepositoryDto = z.infer<typeof AnalyzeRepositorySchema>['body'];
