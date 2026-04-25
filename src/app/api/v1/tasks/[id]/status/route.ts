import { apiHandler } from '@/shared/middleware/api-handler';
import { TaskService } from '@/modules/tasks/task.service';
import { updateStatusSchema } from '@/modules/tasks/task.validator';
import type { UpdateStatusInput } from '@/modules/tasks/task.validator';

export const PATCH = apiHandler({
  validate: { body: updateStatusSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as UpdateStatusInput;
    const task = await TaskService.updateStatus(ctx.params.id, body);
    return { data: task.toJSON() };
  },
});
