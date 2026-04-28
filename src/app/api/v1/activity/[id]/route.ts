import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { ActivityService } from '@/modules/activity/activity.service';

export const DELETE = apiHandler({
  middleware: [requireRole('admin')],
  handler: async (_req, ctx) => {
    await ActivityService.delete(ctx.params.id);
    return { data: { deleted: true } };
  },
});
