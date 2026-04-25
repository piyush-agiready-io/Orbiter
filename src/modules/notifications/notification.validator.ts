import { z } from 'zod';

export const queryNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type QueryNotificationsInput = z.infer<typeof queryNotificationsSchema>;
