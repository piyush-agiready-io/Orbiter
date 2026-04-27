import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { UserService } from '@/modules/users/user.service';

export const DELETE = apiHandler({
  middleware: [requireRole('admin')],
  handler: async (_req, ctx) => {
    if (ctx.params.id === ctx.user.userId) {
      return { data: null, status: 400 };
    }
    const result = await UserService.removeFromPlatform(ctx.params.id);
    return { data: { deleted: true, hardDeleted: result.hardDeleted } };
  },
});
