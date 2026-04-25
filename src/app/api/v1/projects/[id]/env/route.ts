import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { EnvVariableService } from '@/modules/env-variables/env-variable.service';
import {
  createEnvVariableSchema,
  envVariableQuerySchema,
} from '@/modules/env-variables/env-variable.validator';
import type { CreateEnvVariableInput } from '@/modules/env-variables/env-variable.validator';

export const GET = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { query: envVariableQuerySchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const query = ctx.query as { page: number; limit: number; environment?: string };
    const result = await EnvVariableService.list(ctx.params.id, query);
    return {
      data: {
        envVars: result.envVars.map((e) => e.toJSON()),
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  },
});

export const POST = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: createEnvVariableSchema },
  handler: async (req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const body = ctx.body as CreateEnvVariableInput;
    const ip = req.headers.get('x-forwarded-for') ?? undefined;
    const envVar = await EnvVariableService.create(
      ctx.params.id,
      body,
      ctx.user.userId,
      ip,
    );
    return { data: envVar.toJSON(), status: 201 };
  },
});
