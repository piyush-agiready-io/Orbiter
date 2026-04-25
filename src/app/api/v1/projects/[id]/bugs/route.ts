import { apiHandler } from '@/shared/middleware/api-handler';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { BugService } from '@/modules/bugs/bug.service';
import {
  createBugSchema,
  queryBugsSchema,
} from '@/modules/bugs/bug.validator';
import type { CreateBugInput, QueryBugsInput } from '@/modules/bugs/bug.validator';

export const GET = apiHandler({
  validate: { query: queryBugsSchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const query = ctx.query as QueryBugsInput;
    const result = await BugService.list(ctx.params.id, query);
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
  validate: { body: createBugSchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const body = ctx.body as CreateBugInput;
    const bug = await BugService.create(ctx.params.id, body, ctx.user.userId);
    return { data: bug.toJSON(), status: 201 };
  },
});
