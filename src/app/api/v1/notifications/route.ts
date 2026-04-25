import { apiHandler } from '@/shared/middleware/api-handler';
import { NotificationService } from '@/modules/notifications/notification.service';
import { queryNotificationsSchema } from '@/modules/notifications/notification.validator';
import type { QueryNotificationsInput } from '@/modules/notifications/notification.validator';

export const GET = apiHandler({
  validate: { query: queryNotificationsSchema },
  handler: async (_req, ctx) => {
    const query = ctx.query as QueryNotificationsInput;
    const result = await NotificationService.list(ctx.user.userId, query);
    return {
      data: {
        notifications: result.notifications.map((n) => n.toJSON()),
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  },
});
