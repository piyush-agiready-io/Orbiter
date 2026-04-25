import { apiHandler } from '@/shared/middleware/api-handler';
import { LinkService } from '@/modules/links/link.service';
import { updateLinkSchema } from '@/modules/links/link.validator';
import type { UpdateLinkInput } from '@/modules/links/link.validator';

export const PATCH = apiHandler({
  validate: { body: updateLinkSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as UpdateLinkInput;
    const link = await LinkService.update(ctx.params.id, body);
    return { data: link.toJSON() };
  },
});

export const DELETE = apiHandler({
  handler: async (_req, ctx) => {
    await LinkService.delete(ctx.params.id);
    return { data: { deleted: true } };
  },
});
