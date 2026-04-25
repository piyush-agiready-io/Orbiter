import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { SprintService } from '@/modules/sprints/sprint.service';
import { updateSprintSchema } from '@/modules/sprints/sprint.validator';
import type { UpdateSprintInput } from '@/modules/sprints/sprint.validator';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const sprint = await SprintService.getById(ctx.params.id);
    return { data: sprint.toJSON() };
  },
});

export const PATCH = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: updateSprintSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as UpdateSprintInput;
    if (body.status === 'active') {
      const existing = await SprintService.getById(ctx.params.id);
      const sprint = await SprintService.activate(ctx.params.id, existing.project.toString());
      return { data: sprint.toJSON() };
    }
    const sprint = await SprintService.update(ctx.params.id, body);
    return { data: sprint.toJSON() };
  },
});
