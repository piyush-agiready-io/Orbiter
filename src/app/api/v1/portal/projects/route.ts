import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { ProjectService } from '@/modules/projects/project.service';

export const GET = apiHandler({
  middleware: [requireRole('client')],
  handler: async (_req, ctx) => {
    const result = await ProjectService.findByClient(ctx.user.userId);
    return {
      data: {
        projects: result.data.map((p) => p.toJSON()),
        total: result.total,
      },
    };
  },
});
