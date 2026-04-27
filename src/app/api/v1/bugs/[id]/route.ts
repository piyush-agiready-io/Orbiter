import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { BugService } from '@/modules/bugs/bug.service';
import { updateBugSchema } from '@/modules/bugs/bug.validator';
import type { UpdateBugInput } from '@/modules/bugs/bug.validator';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const bug = await BugService.getById(ctx.params.id);
    return { data: bug.toJSON() };
  },
});

export const PATCH = apiHandler({
  validate: { body: updateBugSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as UpdateBugInput;
    const bug = await BugService.update(ctx.params.id, body, ctx.user.userId);
    return { data: bug.toJSON() };
  },
});

export const DELETE = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  handler: async (_req, ctx) => {
    await BugService.delete(ctx.params.id);
    return { data: { deleted: true } };
  },
});
