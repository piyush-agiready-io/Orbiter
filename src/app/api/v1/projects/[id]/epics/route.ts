import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { EpicService } from '@/modules/epics/epic.service';
import { ActivityService } from '@/modules/activity/activity.service';
import { createEpicSchema, epicQuerySchema } from '@/modules/epics/epic.validator';
import type { CreateEpicInput } from '@/modules/epics/epic.validator';

export const GET = apiHandler({
  validate: { query: epicQuerySchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const query = ctx.query as Record<string, unknown>;
    const result = await EpicService.list(ctx.params.id, query);
    return {
      data: {
        epics: result.epics.map((e) => e.toJSON()),
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  },
});

export const POST = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: createEpicSchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const body = ctx.body as CreateEpicInput;
    const epic = await EpicService.create(ctx.params.id, body, ctx.user.userId);
    ActivityService.log({
      project: ctx.params.id, actor: ctx.user.userId,
      action: 'epic_created', targetType: 'epic',
      targetId: epic._id.toString(), targetTitle: epic.title,
    }).catch(() => {});
    return { data: epic.toJSON(), status: 201 };
  },
});
