import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i);

export const createEpicSchema = z.object({
  title: z.string().min(2).max(300),
  description: z.string().max(5000).optional(),
  ownerId: objectId,
  status: z.enum(['planning', 'active', 'done']).default('planning'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const updateEpicSchema = z.object({
  title: z.string().min(2).max(300).optional(),
  description: z.string().max(5000).optional(),
  ownerId: objectId.optional(),
  status: z.enum(['planning', 'active', 'done']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const epicQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  status: z.enum(['planning', 'active', 'done']).optional(),
  search: z.string().optional(),
  sort: z.enum(['-createdAt', 'createdAt', '-startDate', 'startDate', '-endDate', 'endDate', '-title', 'title', '-updatedAt', 'updatedAt']).default('-createdAt'),
});

export type CreateEpicInput = z.infer<typeof createEpicSchema>;
export type UpdateEpicInput = z.infer<typeof updateEpicSchema>;
