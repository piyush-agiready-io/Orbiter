import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

const githubRepoSchema = z.object({
  owner: z.string().min(1).max(100),
  repo: z.string().min(1).max(100),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  setupNotes: z.string().max(10000).optional(),
  status: z.enum(['active', 'archived']).optional(),
  githubRepos: z.array(githubRepoSchema).max(20).optional(),
});

export const projectQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['active', 'archived']).optional(),
  search: z.string().optional(),
});

export const memberActionSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['member', 'client']).default('member'),
  action: z.enum(['add', 'remove']).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
