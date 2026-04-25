import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { EnvVariableService } from '@/modules/env-variables/env-variable.service';

export const GET = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  handler: async (req, ctx) => {
    const ip = req.headers.get('x-forwarded-for') ?? undefined;
    const revealed = await EnvVariableService.reveal(
      ctx.params.id,
      ctx.user.userId,
      ip,
    );
    return { data: revealed };
  },
});
