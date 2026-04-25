import { apiHandler } from '@/shared/middleware/api-handler';
import { ActivityService } from '@/modules/activity/activity.service';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import '@/modules/users/user.model';

export const GET = apiHandler({
  handler: async (req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const page = Number(req.nextUrl.searchParams.get('page') ?? '1');
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? '20');
    const result = await ActivityService.listByProject(ctx.params.id, { page, limit });
    return { data: result };
  },
});
