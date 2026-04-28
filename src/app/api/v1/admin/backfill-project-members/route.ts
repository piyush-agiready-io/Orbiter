import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { ProjectService } from '@/modules/projects/project.service';
import '@/modules/users/user.model';

export const POST = apiHandler({
  middleware: [requireRole('admin')],
  handler: async () => {
    const result = await ProjectService.backfillTeamMembers();
    return { data: result };
  },
});
