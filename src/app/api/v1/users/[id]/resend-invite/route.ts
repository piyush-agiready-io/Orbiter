import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { UserService } from '@/modules/users/user.service';

export const POST = apiHandler({
  middleware: [requireRole('admin')],
  handler: async (_req, ctx) => {
    const result = await UserService.resendInvite(ctx.params.id);
    return { data: result };
  },
});
