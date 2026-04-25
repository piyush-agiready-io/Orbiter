import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { ProjectService } from '@/modules/projects/project.service';
import { TaskService } from '@/modules/tasks/task.service';

export const GET = apiHandler({
  middleware: [requireRole('client')],
  handler: async (req, ctx) => {
    await ProjectService.requireClientAccess(ctx.params.id, ctx.user.userId);
    const url = new URL(req.url);
    const query = {
      page: Number(url.searchParams.get('page')) || 1,
      limit: Number(url.searchParams.get('limit')) || 20,
      status: url.searchParams.get('status') ?? undefined,
      sort: url.searchParams.get('sort') ?? undefined,
    };
    const result = await TaskService.getClientVisibleTasks(ctx.params.id, query);
    return {
      data: {
        tasks: result.tasks.map((t) => t.toJSON()),
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  },
});
