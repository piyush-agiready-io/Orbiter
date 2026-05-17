import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i);

export const createBugSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(5000).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P2'),
  source: z.enum(['manual', 'extension']).default('manual'),
  metadata: z
    .object({
      url: z.string().url().optional(),
      consoleLogs: z.string().max(50000).optional(),
      networkLogs: z.string().max(50000).optional(),
      screenshot: z.string().url().optional(),
      device: z.string().max(100).optional(),
      browser: z.string().max(100).optional(),
      os: z.string().max(100).optional(),
      viewport: z
        .object({
          width: z.number().positive(),
          height: z.number().positive(),
        })
        .optional(),
      ip: z.string().optional(),
    })
    .optional(),
});

export const updateBugSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  status: z.enum(['open', 'investigating', 'resolved', 'closed']).optional(),
  assigneeId: objectId.nullable().optional(),
  metadata: z
    .object({
      url: z.string().url().optional(),
      consoleLogs: z.string().max(50000).optional(),
      networkLogs: z.string().max(50000).optional(),
      screenshot: z.string().url().optional(),
      device: z.string().max(100).optional(),
      browser: z.string().max(100).optional(),
      os: z.string().max(100).optional(),
      viewport: z
        .object({
          width: z.number().positive(),
          height: z.number().positive(),
        })
        .optional(),
      ip: z.string().optional(),
    })
    .optional(),
});

export const queryBugsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['open', 'investigating', 'resolved', 'closed']).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  source: z.enum(['manual', 'extension']).optional(),
  search: z.string().optional(),
  sort: z.enum(['-createdAt', 'createdAt', '-priority', 'priority', '-status', 'status', '-title', 'title', '-updatedAt', 'updatedAt']).default('-createdAt'),
});

export const linkBugSchema = z.object({
  taskId: z.string().nullable(),
});

export type CreateBugInput = z.infer<typeof createBugSchema>;
export type UpdateBugInput = z.infer<typeof updateBugSchema>;
export type QueryBugsInput = z.infer<typeof queryBugsSchema>;
export type LinkBugInput = z.infer<typeof linkBugSchema>;
