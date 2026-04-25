import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { SprintService } from '@/modules/sprints/sprint.service';
import { sprintTasksSchema } from '@/modules/sprints/sprint.validator';
import type { SprintTasksInput } from '@/modules/sprints/sprint.validator';

export const POST = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: sprintTasksSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as SprintTasksInput;
    const result = await SprintService.addTasks(ctx.params.id, body);
    return { data: result };
  },
});

export const DELETE = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: sprintTasksSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as SprintTasksInput;
    const result = await SprintService.removeTasks(ctx.params.id, body);
    return { data: result };
  },
});
