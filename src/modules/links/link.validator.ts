import { z } from 'zod';

export const linkTypeEnum = z.enum([
  'production',
  'staging',
  'figma',
  'api_docs',
  'repository',
  'other',
]);

export const createLinkSchema = z.object({
  label: z.string().min(1).max(100),
  url: z.string().url().max(2000),
  type: linkTypeEnum,
});

export const updateLinkSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  url: z.string().url().max(2000).optional(),
  type: linkTypeEnum.optional(),
});

export const linkQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: linkTypeEnum.optional(),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
