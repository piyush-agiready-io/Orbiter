import { z } from 'zod';
import { ROLES } from '@/shared/utils/constants';

export const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(ROLES),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'internal']),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar: z.string().url().optional(),
  skills: z.array(z.string().trim()).optional(),
  notificationPreferences: z
    .object({
      emailDigest: z.enum(['immediate', 'daily', 'none']),
    })
    .optional(),
});

export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(ROLES).optional(),
  search: z.string().optional(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
