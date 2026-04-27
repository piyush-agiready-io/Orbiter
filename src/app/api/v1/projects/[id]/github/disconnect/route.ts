import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { Project } from '@/modules/projects/project.model';
import { GitHubSyncModel } from '@/modules/github/github.model';
import '@/modules/users/user.model';

export const POST = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  handler: async (_req, ctx) => {
    await Promise.all([
      Project.findByIdAndUpdate(ctx.params.id, {
        $unset: { githubOAuth: 1 },
        $set: { githubRepos: [] },
      }),
      GitHubSyncModel.deleteMany({ project: ctx.params.id }),
    ]);
    return { data: { disconnected: true } };
  },
});
