import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { ProjectService } from '@/modules/projects/project.service';
import { EpicService } from '@/modules/epics/epic.service';

export const GET = apiHandler({
  middleware: [requireRole('client')],
  handler: async (_req, ctx) => {
    await ProjectService.requireClientAccess(ctx.params.id, ctx.user.userId);
    const epics = await EpicService.getByProject(ctx.params.id);
    return {
      data: epics.map((e) => e.toJSON()),
    };
  },
});
