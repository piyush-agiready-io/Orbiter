import { apiHandler } from '@/shared/middleware/api-handler';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { DocService } from '@/modules/docs/doc.service';
import {
  createDocSchema,
  docQuerySchema,
} from '@/modules/docs/doc.validator';
import type { CreateDocInput } from '@/modules/docs/doc.validator';

export const GET = apiHandler({
  validate: { query: docQuerySchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const query = ctx.query as { page: number; limit: number };
    const result = await DocService.list(ctx.params.id, query);
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

export const POST = apiHandler({
  validate: { body: createDocSchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const body = ctx.body as CreateDocInput;
    const doc = await DocService.create(ctx.params.id, body, ctx.user.userId);
    return { data: doc.toJSON(), status: 201 };
  },
});
