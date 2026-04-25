import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { Project } from '@/modules/projects/project.model';
import '@/modules/users/user.model';

export const POST = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  handler: async (_req, ctx) => {
    await Project.findByIdAndUpdate(ctx.params.id, {
      $unset: { githubOAuth: 1 },
      $set: { githubRepos: [] },
    });
    return { data: { disconnected: true } };
  },
});
