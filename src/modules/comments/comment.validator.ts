import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z.string().min(1).max(10000).trim(),
  mentions: z.array(z.string()).default([]),
});

export const queryCommentsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type QueryCommentsInput = z.infer<typeof queryCommentsSchema>;
