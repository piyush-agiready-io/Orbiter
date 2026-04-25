import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { SprintService } from '@/modules/sprints/sprint.service';
import { createSprintSchema, sprintQuerySchema } from '@/modules/sprints/sprint.validator';
import type { CreateSprintInput } from '@/modules/sprints/sprint.validator';

export const GET = apiHandler({
  validate: { query: sprintQuerySchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const query = ctx.query as { page: number; limit: number; status?: string };
    const result = await SprintService.list(ctx.params.id, query);
    return {
      data: {
        sprints: result.sprints.map((s) => s.toJSON()),
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  },
});

export const POST = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: createSprintSchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const body = ctx.body as CreateSprintInput;
    const sprint = await SprintService.create(ctx.params.id, body);
    return { data: sprint.toJSON(), status: 201 };
  },
});
