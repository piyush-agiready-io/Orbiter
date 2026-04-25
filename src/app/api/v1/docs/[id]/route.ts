import { apiHandler } from '@/shared/middleware/api-handler';
import { DocService } from '@/modules/docs/doc.service';
import { updateDocSchema } from '@/modules/docs/doc.validator';
import type { UpdateDocInput } from '@/modules/docs/doc.validator';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const doc = await DocService.getById(ctx.params.id);
    return { data: doc.toJSON() };
  },
});

export const PATCH = apiHandler({
  validate: { body: updateDocSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as UpdateDocInput;
    const doc = await DocService.update(ctx.params.id, body);
    return { data: doc.toJSON() };
  },
});

export const DELETE = apiHandler({
  handler: async (_req, ctx) => {
    await DocService.delete(ctx.params.id);
    return { data: { deleted: true } };
  },
});
