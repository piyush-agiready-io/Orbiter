import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { BugService } from '@/modules/bugs/bug.service';
import { linkBugSchema } from '@/modules/bugs/bug.validator';
import type { LinkBugInput } from '@/modules/bugs/bug.validator';

export const PATCH = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: linkBugSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as LinkBugInput;
    const bug = await BugService.linkToTask(ctx.params.id, body.taskId);
    return { data: bug.toJSON() };
  },
});
