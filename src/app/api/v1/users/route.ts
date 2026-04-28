import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { UserService } from '@/modules/users/user.service';
import { userQuerySchema } from '@/modules/users/user.validator';

export const GET = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { query: userQuerySchema },
  handler: async (_req, ctx) => {
    const query = ctx.query as { page: number; limit: number; role?: string; search?: string };
    const result = await UserService.list(query);
    return {
      data: {
        users: result.users,
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  },
});
