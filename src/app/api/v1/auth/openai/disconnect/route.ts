import { apiHandler } from '@/shared/middleware/api-handler';
import { OpenAIConnectionService } from '@/modules/ai/openai-connection.service';

export const POST = apiHandler({
  handler: async (_req, ctx) => {
    const { userId } = ctx.user;
    await OpenAIConnectionService.disconnect(userId);
    return { data: { disconnected: true } };
  },
});
