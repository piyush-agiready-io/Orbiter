import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { SprintService } from '@/modules/sprints/sprint.service';
import { closeSprintSchema } from '@/modules/sprints/sprint.validator';
import type { CloseSprintInput } from '@/modules/sprints/sprint.validator';

export const POST = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: closeSprintSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as CloseSprintInput;
    const sprint = await SprintService.close(ctx.params.id, body);
    return { data: sprint.toJSON() };
  },
});
