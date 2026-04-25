import { apiHandler } from '@/shared/middleware/api-handler';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { LinkService } from '@/modules/links/link.service';
import {
  createLinkSchema,
  linkQuerySchema,
} from '@/modules/links/link.validator';
import type { CreateLinkInput } from '@/modules/links/link.validator';

export const GET = apiHandler({
  validate: { query: linkQuerySchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const query = ctx.query as { page: number; limit: number; type?: string };
    const result = await LinkService.list(ctx.params.id, query);
    return {
      data: {
        links: result.links.map((l) => l.toJSON()),
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  },
});

export const POST = apiHandler({
  validate: { body: createLinkSchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const body = ctx.body as CreateLinkInput;
    const link = await LinkService.create(ctx.params.id, body);
    return { data: link.toJSON(), status: 201 };
  },
});
