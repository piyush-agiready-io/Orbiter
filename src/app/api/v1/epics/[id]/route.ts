import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { EpicService } from '@/modules/epics/epic.service';
import { ActivityService } from '@/modules/activity/activity.service';
import { updateEpicSchema } from '@/modules/epics/epic.validator';
import type { UpdateEpicInput } from '@/modules/epics/epic.validator';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const epic = await EpicService.getById(ctx.params.id);
    await checkProjectAccess(epic.project.toString(), ctx.user.userId, ctx.user.role);
    return { data: epic.toJSON() };
  },
});

export const PATCH = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: updateEpicSchema },
  handler: async (_req, ctx) => {
    const epic = await EpicService.getById(ctx.params.id);
    await checkProjectAccess(epic.project.toString(), ctx.user.userId, ctx.user.role);
    const body = ctx.body as UpdateEpicInput;
    const updated = await EpicService.update(ctx.params.id, body);
    ActivityService.log({
      project: epic.project.toString(), actor: ctx.user.userId,
      action: 'epic_updated', targetType: 'epic',
      targetId: epic._id.toString(), targetTitle: epic.title,
    }).catch(() => {});
    return { data: updated.toJSON() };
  },
});

export const DELETE = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  handler: async (_req, ctx) => {
    const epic = await EpicService.getById(ctx.params.id);
    await checkProjectAccess(epic.project.toString(), ctx.user.userId, ctx.user.role);
    await EpicService.delete(ctx.params.id);
    ActivityService.log({
      project: epic.project.toString(), actor: ctx.user.userId,
      action: 'epic_deleted', targetType: 'epic',
      targetId: epic._id.toString(), targetTitle: epic.title,
    }).catch(() => {});
    return { data: { deleted: true } };
  },
});
