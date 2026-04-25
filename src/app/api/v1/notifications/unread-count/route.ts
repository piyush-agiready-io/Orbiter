import { apiHandler } from '@/shared/middleware/api-handler';
import { NotificationService } from '@/modules/notifications/notification.service';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const result = await NotificationService.getUnreadCount(ctx.user.userId);
    return { data: result };
  },
});
