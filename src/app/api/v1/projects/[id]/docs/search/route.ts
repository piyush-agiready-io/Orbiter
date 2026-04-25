import { apiHandler } from '@/shared/middleware/api-handler';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { DocService } from '@/modules/docs/doc.service';
import { docSearchSchema } from '@/modules/docs/doc.validator';

export const GET = apiHandler({
  validate: { query: docSearchSchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const query = ctx.query as { q: string; page: number; limit: number };
    const result = await DocService.search(ctx.params.id, query);
    return {
      data: {
        docs: result.docs.map((d) => d.toJSON()),
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  },
});
