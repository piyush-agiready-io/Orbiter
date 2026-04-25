import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { EnvVariableService } from '@/modules/env-variables/env-variable.service';
import { auditQuerySchema } from '@/modules/env-variables/env-variable.validator';

export const GET = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { query: auditQuerySchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const query = ctx.query as { page: number; limit: number };
    const result = await EnvVariableService.getAuditLog(ctx.params.id, query);
    return {
      data: {
        logs: result.logs.map((l) => l.toJSON()),
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  },
});
