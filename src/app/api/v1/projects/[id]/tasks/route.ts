import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { TaskService } from '@/modules/tasks/task.service';
import { createTaskSchema, taskQuerySchema } from '@/modules/tasks/task.validator';
import type { CreateTaskInput } from '@/modules/tasks/task.validator';

export const GET = apiHandler({
  validate: { query: taskQuerySchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const query = ctx.query as Record<string, unknown>;
    const result = await TaskService.list(ctx.params.id, query);
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

export const POST = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: createTaskSchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const body = ctx.body as CreateTaskInput;
    const task = await TaskService.create(ctx.params.id, body, ctx.user.userId);
    return { data: task.toJSON(), status: 201 };
  },
});
