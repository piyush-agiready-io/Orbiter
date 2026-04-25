import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { EnvVariableService } from '@/modules/env-variables/env-variable.service';
import { updateEnvVariableSchema } from '@/modules/env-variables/env-variable.validator';
import type { UpdateEnvVariableInput } from '@/modules/env-variables/env-variable.validator';

export const PATCH = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: updateEnvVariableSchema },
  handler: async (req, ctx) => {
    const body = ctx.body as UpdateEnvVariableInput;
    const ip = req.headers.get('x-forwarded-for') ?? undefined;
    const envVar = await EnvVariableService.update(
      ctx.params.id,
      body,
      ctx.user.userId,
      ip,
    );
    return { data: envVar.toJSON() };
  },
});

export const DELETE = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  handler: async (req, ctx) => {
    const ip = req.headers.get('x-forwarded-for') ?? undefined;
    await EnvVariableService.delete(ctx.params.id, ctx.user.userId, ip);
    return { data: { deleted: true } };
  },
});
