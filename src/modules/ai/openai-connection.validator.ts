import { z } from 'zod';

export const initiateConnectionSchema = z.object({
  mode: z.enum(['device-code', 'manual']),
  apiKey: z.string().optional(),
});

export const pollConnectionSchema = z.object({
  sessionId: z.string().optional(),
});

export type InitiateConnectionInput = z.infer<typeof initiateConnectionSchema>;
export type PollConnectionInput = z.infer<typeof pollConnectionSchema>;
