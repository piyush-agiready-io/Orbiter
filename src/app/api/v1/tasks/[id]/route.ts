import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { TaskService } from '@/modules/tasks/task.service';
import { updateTaskSchema } from '@/modules/tasks/task.validator';
import type { UpdateTaskInput } from '@/modules/tasks/task.validator';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const task = await TaskService.getById(ctx.params.id);
    await checkProjectAccess(task.project.toString(), ctx.user.userId, ctx.user.role);
    return { data: task.toJSON() };
  },
});

export const PATCH = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: updateTaskSchema },
  handler: async (_req, ctx) => {
    const task = await TaskService.getById(ctx.params.id);
    await checkProjectAccess(task.project.toString(), ctx.user.userId, ctx.user.role);
    const body = ctx.body as UpdateTaskInput;
    const updated = await TaskService.update(ctx.params.id, body);
    return { data: updated.toJSON() };
  },
});

export const DELETE = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  handler: async (_req, ctx) => {
    const task = await TaskService.getById(ctx.params.id);
    await checkProjectAccess(task.project.toString(), ctx.user.userId, ctx.user.role);
    await TaskService.delete(ctx.params.id);
    return { data: { deleted: true } };
  },
});
