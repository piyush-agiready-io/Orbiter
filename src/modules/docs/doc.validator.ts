import { z } from 'zod';

const linkedEntitySchema = z.object({
  type: z.enum(['epic', 'task', 'sprint']),
  ref: z.string().min(1),
});

export const createDocSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.record(z.string(), z.unknown()).optional(),
  contentPlaintext: z.string().optional(),
  linkedTo: z.array(linkedEntitySchema).optional(),
});

export const updateDocSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  contentPlaintext: z.string().optional(),
  linkedTo: z.array(linkedEntitySchema).optional(),
});

export const docQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const docSearchSchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateDocInput = z.infer<typeof createDocSchema>;
export type UpdateDocInput = z.infer<typeof updateDocSchema>;
