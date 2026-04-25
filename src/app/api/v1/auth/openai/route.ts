import { apiHandler } from '@/shared/middleware/api-handler';
import { OpenAIConnectionService } from '@/modules/ai/openai-connection.service';
import { initiateConnectionSchema } from '@/modules/ai/openai-connection.validator';
import type { InitiateConnectionInput } from '@/modules/ai/openai-connection.validator';

export const POST = apiHandler({
  validate: { body: initiateConnectionSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as InitiateConnectionInput;
    const { userId } = ctx.user;

    if (body.mode === 'manual') {
      if (!body.apiKey) {
        throw new Error('apiKey is required for manual mode');
      }
      await OpenAIConnectionService.storeManualKey(userId, body.apiKey);
      return { data: { mode: 'manual', connected: true } };
    }

    // device-code mode
    const deviceCode = await OpenAIConnectionService.initiateDeviceCode(userId);
    return { data: { mode: 'device-code', ...deviceCode } };
  },
});
