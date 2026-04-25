import { apiHandler } from '@/shared/middleware/api-handler';
import { NotificationService } from '@/modules/notifications/notification.service';

export const POST = apiHandler({
  handler: async (_req, ctx) => {
    await NotificationService.markAllRead(ctx.user.userId);
    return { data: { success: true } };
  },
});
