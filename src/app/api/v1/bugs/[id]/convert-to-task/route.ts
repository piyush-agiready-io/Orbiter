import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { BugService } from '@/modules/bugs/bug.service';

export const POST = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  handler: async (_req, ctx) => {
    const result = await BugService.convertToTask(ctx.params.id, ctx.user.userId);
    return { data: result, status: 201 };
  },
});
