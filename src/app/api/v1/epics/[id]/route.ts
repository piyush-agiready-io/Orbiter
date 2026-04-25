import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { EpicService } from '@/modules/epics/epic.service';
import { updateEpicSchema } from '@/modules/epics/epic.validator';
import type { UpdateEpicInput } from '@/modules/epics/epic.validator';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const epic = await EpicService.getById(ctx.params.id);
    return { data: epic.toJSON() };
  },
});

export const PATCH = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: updateEpicSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as UpdateEpicInput;
    const epic = await EpicService.update(ctx.params.id, body);
    return { data: epic.toJSON() };
  },
});

export const DELETE = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  handler: async (_req, ctx) => {
    await EpicService.delete(ctx.params.id);
    return { data: { deleted: true } };
  },
});
