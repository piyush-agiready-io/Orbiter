import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i);

export const createSprintSchema = z.object({
  name: z.string().min(1).max(100),
  goal: z.string().max(500).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const updateSprintSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  goal: z.string().max(500).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(['planning', 'active']).optional(),
  retroNotes: z.string().max(5000).optional(),
});

export const sprintQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['planning', 'active', 'closed']).optional(),
});

export const closeSprintSchema = z.object({
  retroNotes: z.string().max(5000).optional(),
  rolloverTaskIds: z.array(objectId).default([]),
});

export const sprintTasksSchema = z.object({
  taskIds: z.array(objectId).min(1).max(100),
});

export type CreateSprintInput = z.infer<typeof createSprintSchema>;
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>;
export type CloseSprintInput = z.infer<typeof closeSprintSchema>;
export type SprintTasksInput = z.infer<typeof sprintTasksSchema>;
