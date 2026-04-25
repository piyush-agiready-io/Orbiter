import { z } from 'zod';

export const createEpicSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(['planning', 'active', 'done']).default('planning'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const updateEpicSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['planning', 'active', 'done']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const epicQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['planning', 'active', 'done']).optional(),
  search: z.string().optional(),
});

export type CreateEpicInput = z.infer<typeof createEpicSchema>;
export type UpdateEpicInput = z.infer<typeof updateEpicSchema>;
export type EpicQueryInput = z.infer<typeof epicQuerySchema>;
