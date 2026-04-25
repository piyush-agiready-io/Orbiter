import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i);

export const createTaskSchema = z.object({
  title: z.string().min(2).max(300),
  description: z.string().max(5000).optional(),
  type: z.enum(['feature', 'chore', 'improvement']).default('feature'),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P2'),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).default('backlog'),
  sprintId: objectId.optional(),
  assigneeId: objectId.optional(),
  tags: z.array(z.string().trim()).default([]),
  clientVisible: z.boolean().default(false),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).max(300).optional(),
  description: z.string().max(5000).optional(),
  type: z.enum(['feature', 'chore', 'improvement']).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional(),
  sprintId: objectId.nullable().optional(),
  assigneeId: objectId.nullable().optional(),
  tags: z.array(z.string().trim()).optional(),
  clientVisible: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export const taskQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  type: z.enum(['feature', 'chore', 'improvement']).optional(),
  assignee: objectId.optional(),
  sprint: objectId.optional(),
  search: z.string().optional(),
  sort: z.enum(['-createdAt', 'createdAt', '-priority', 'priority', '-status', 'status', '-title', 'title', '-updatedAt', 'updatedAt']).default('-createdAt'),
});

export const updateStatusSchema = z.object({
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']),
  order: z.number().int().min(0).optional(),
});

export const bulkUpdateSchema = z.object({
  taskIds: z.array(objectId).min(1).max(50),
  update: z.object({
    status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional(),
    priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
    assigneeId: objectId.nullable().optional(),
    sprintId: objectId.nullable().optional(),
  }),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type BulkUpdateInput = z.infer<typeof bulkUpdateSchema>;
