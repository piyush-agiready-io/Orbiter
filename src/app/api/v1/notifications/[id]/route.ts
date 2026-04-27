import { apiHandler } from '@/shared/middleware/api-handler';
import { NotificationService } from '@/modules/notifications/notification.service';

export const DELETE = apiHandler({
  handler: async (_req, ctx) => {
    await NotificationService.delete(ctx.params.id, ctx.user.userId);
    return { data: { deleted: true } };
  },
});
