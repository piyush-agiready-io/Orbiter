import { z } from 'zod';
import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { ProjectService } from '@/modules/projects/project.service';
import { ActivityService } from '@/modules/activity/activity.service';

const inviteClientSchema = z.object({
  email: z.string().email(),
});

export const POST = apiHandler({
  middleware: [requireRole('admin')],
  validate: { body: inviteClientSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as { email: string };
    const result = await ProjectService.inviteClientToProject(ctx.params.id, body.email);

    ActivityService.log({
      project: ctx.params.id,
      actor: ctx.user.userId,
      action: 'member_added',
      targetType: 'member',
      targetId: String((result.user as { id?: string }).id ?? ''),
      meta: { role: 'client' },
    }).catch(() => {});

    return { data: result, status: 201 };
  },
});
