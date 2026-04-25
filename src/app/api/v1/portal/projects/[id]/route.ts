import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { ProjectService } from '@/modules/projects/project.service';
import { TaskService } from '@/modules/tasks/task.service';

export const GET = apiHandler({
  middleware: [requireRole('client')],
  handler: async (_req, ctx) => {
    await ProjectService.requireClientAccess(ctx.params.id, ctx.user.userId);
    const project = await ProjectService.getById(ctx.params.id);
    const progress = await TaskService.getClientProjectProgress(ctx.params.id);
    return {
      data: { ...project.toJSON(), progress },
    };
  },
});
