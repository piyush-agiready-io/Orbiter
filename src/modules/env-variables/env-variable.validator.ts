import { z } from 'zod';

export const envEnvironmentEnum = z.enum(['dev', 'prod']);

export const createEnvVariableSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Key must be uppercase with underscores (e.g. DATABASE_URL)'),
  value: z.string().min(0).max(10000),
  environment: envEnvironmentEnum,
});

export const updateEnvVariableSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Key must be uppercase with underscores')
    .optional(),
  value: z.string().min(0).max(10000).optional(),
  environment: envEnvironmentEnum.optional(),
});

export const envVariableQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  environment: envEnvironmentEnum.optional(),
});

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateEnvVariableInput = z.infer<typeof createEnvVariableSchema>;
export type UpdateEnvVariableInput = z.infer<typeof updateEnvVariableSchema>;
