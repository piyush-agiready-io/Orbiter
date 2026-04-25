import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { ProjectService } from '@/modules/projects/project.service';
import { ActivityService } from '@/modules/activity/activity.service';
import { memberActionSchema } from '@/modules/projects/project.validator';

export const POST = apiHandler({
  middleware: [requireRole('admin')],
  validate: { body: memberActionSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as { userId: string; role: 'member' | 'client'; action?: string };

    if (body.action === 'remove') {
      const project = await ProjectService.removeMember(ctx.params.id, body.userId);
      ActivityService.log({
        project: ctx.params.id, actor: ctx.user.userId,
        action: 'member_removed', targetType: 'member',
        targetId: body.userId,
      }).catch(() => {});
      return { data: project.toJSON() };
    }

    const project = await ProjectService.addMember(ctx.params.id, body.userId, body.role);
    ActivityService.log({
      project: ctx.params.id, actor: ctx.user.userId,
      action: 'member_added', targetType: 'member',
      targetId: body.userId, meta: { role: body.role },
    }).catch(() => {});
    return { data: project.toJSON(), status: 201 };
  },
});

export const DELETE = apiHandler({
  middleware: [requireRole('admin')],
  validate: { body: memberActionSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as { userId: string; role: 'member' | 'client' };
    const project = await ProjectService.removeMember(ctx.params.id, body.userId);
    return { data: project.toJSON() };
  },
});
