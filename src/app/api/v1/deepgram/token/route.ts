import { apiHandler } from '@/shared/middleware/api-handler';
import { DeepgramService } from '@/modules/deepgram/deepgram.service';

export const POST = apiHandler({
  handler: async () => {
    const token = await DeepgramService.generateToken();
    return { data: token, status: 200 };
  },
});
