import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { ProjectService } from '@/modules/projects/project.service';
import { BugService } from '@/modules/bugs/bug.service';
import { ActivityService } from '@/modules/activity/activity.service';
import { createBugSchema, queryBugsSchema } from '@/modules/bugs/bug.validator';
import type { CreateBugInput, QueryBugsInput } from '@/modules/bugs/bug.validator';

export const GET = apiHandler({
  middleware: [requireRole('client')],
  validate: { query: queryBugsSchema },
  handler: async (_req, ctx) => {
    await ProjectService.requireClientAccess(ctx.params.id, ctx.user.userId);
    const query = ctx.query as QueryBugsInput;
    const result = await BugService.listByReporter(
      ctx.params.id,
      ctx.user.userId,
      query,
    );
    return {
      data: {
        bugs: result.bugs.map((b) => b.toJSON()),
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  },
});

export const POST = apiHandler({
  middleware: [requireRole('client')],
  validate: { body: createBugSchema },
  handler: async (_req, ctx) => {
    await ProjectService.requireClientAccess(ctx.params.id, ctx.user.userId);
    const body = ctx.body as CreateBugInput;
    const bug = await BugService.create(ctx.params.id, body, ctx.user.userId);
    ActivityService.log({
      project: ctx.params.id,
      actor: ctx.user.userId,
      action: 'bug_created',
      targetType: 'bug',
      targetId: bug._id.toString(),
      targetTitle: bug.title,
    }).catch(() => {});
    return { data: bug.toJSON(), status: 201 };
  },
});
