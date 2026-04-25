import { apiHandler } from '@/shared/middleware/api-handler';
import { NotificationService } from '@/modules/notifications/notification.service';

export const PATCH = apiHandler({
  handler: async (_req, ctx) => {
    const notification = await NotificationService.markAsRead(
      ctx.params.id,
      ctx.user.userId,
    );
    return { data: notification.toJSON() };
  },
});
