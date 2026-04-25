import { apiHandler } from '@/shared/middleware/api-handler';
import { OpenAIConnectionService } from '@/modules/ai/openai-connection.service';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const { userId } = ctx.user;
    const status = await OpenAIConnectionService.getStatus(userId);
    return { data: status };
  },
});
