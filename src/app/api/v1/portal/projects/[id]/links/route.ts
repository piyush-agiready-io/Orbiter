import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { ProjectService } from '@/modules/projects/project.service';
import { LinkService } from '@/modules/links/link.service';

export const GET = apiHandler({
  middleware: [requireRole('client')],
  handler: async (req, ctx) => {
    await ProjectService.requireClientAccess(ctx.params.id, ctx.user.userId);
    const url = new URL(req.url);
    const query = {
      page: Number(url.searchParams.get('page')) || 1,
      limit: Number(url.searchParams.get('limit')) || 20,
      type: url.searchParams.get('type') ?? undefined,
    };
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
