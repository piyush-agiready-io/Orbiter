import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { TaskService } from '@/modules/tasks/task.service';
import { Task } from '@/modules/tasks/task.model';
import { bulkUpdateSchema } from '@/modules/tasks/task.validator';
import type { BulkUpdateInput } from '@/modules/tasks/task.validator';

export const PATCH = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: bulkUpdateSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as BulkUpdateInput;

    // Verify the user has access to all tasks' projects
    const tasks = await Task.find({ _id: { $in: body.taskIds } }).select('project').lean();
    const projectIds = [...new Set(tasks.map((t) => t.project.toString()))];
    await Promise.all(
      projectIds.map((pid) => checkProjectAccess(pid, ctx.user.userId, ctx.user.role)),
    );

    const result = await TaskService.bulkUpdate(body);
    return { data: { modifiedCount: result.modifiedCount } };
  },
});
