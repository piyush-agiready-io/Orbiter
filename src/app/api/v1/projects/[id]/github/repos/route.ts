import { apiHandler } from '@/shared/middleware/api-handler';
import { GitHubService } from '@/modules/github/github.service';
import { Project } from '@/modules/projects/project.model';
import '@/modules/users/user.model';
import { decrypt } from '@/shared/lib/encryption';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const project = await Project.findById(ctx.params.id)
      .select('+githubOAuth githubRepos')
      .lean();

    if (!project?.githubOAuth?.accessToken) {
      return { data: { repos: [] } };
    }

    const [iv, authTag, encrypted] = project.githubOAuth.accessToken.split(':');
    const token = decrypt(encrypted, iv, authTag);

    const repos = await GitHubService.fetchUserRepos(token);

    const linkedSet = new Set(
      (project.githubRepos ?? []).map((r: { owner: string; repo: string }) => `${r.owner}/${r.repo}`),
    );

    return {
      data: {
        repos: repos.map((r) => ({
          ...r,
          linked: linkedSet.has(r.fullName),
        })),
      },
    };
  },
});
