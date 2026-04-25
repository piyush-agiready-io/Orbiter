import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { TaskService } from '@/modules/tasks/task.service';

export const GET = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  handler: async (req, ctx) => {
    const url = new URL(req.url);
    const includeDone = url.searchParams.get('includeDone') === 'true';
    const tasks = await TaskService.getMyTasks(ctx.user.userId, { includeDone });
    return { data: tasks.map((t) => t.toJSON()) };
  },
});
