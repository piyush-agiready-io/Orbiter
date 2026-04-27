import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { TaskService } from '@/modules/tasks/task.service';

export const POST = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  handler: async (_req, ctx) => {
    const result = await TaskService.showAllToClient(ctx.params.id);
    return { data: result };
  },
});
