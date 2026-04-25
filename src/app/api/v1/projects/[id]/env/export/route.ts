import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { EnvVariableService } from '@/modules/env-variables/env-variable.service';
import { envEnvironmentEnum } from '@/modules/env-variables/env-variable.validator';
import { z } from 'zod';

const exportQuerySchema = z.object({
  environment: envEnvironmentEnum,
});

export const GET = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { query: exportQuerySchema },
  handler: async (req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const query = ctx.query as { environment: 'dev' | 'prod' };
    const ip = req.headers.get('x-forwarded-for') ?? undefined;
    const content = await EnvVariableService.export(
      ctx.params.id,
      query.environment,
      ctx.user.userId,
      ip,
    );
    return { data: { content, environment: query.environment } };
  },
});
