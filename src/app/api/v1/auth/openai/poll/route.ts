import { apiHandler } from '@/shared/middleware/api-handler';
import { OpenAIConnectionService } from '@/modules/ai/openai-connection.service';

export const POST = apiHandler({
  handler: async (_req, ctx) => {
    const { userId } = ctx.user;
    const result = await OpenAIConnectionService.pollAuthorization(userId);

    if (result.authorized) {
      return {
        data: {
          authorized: true,
          email: result.email,
          planType: result.planType,
        },
      };
    }

    return { data: { authorized: false } };
  },
});
