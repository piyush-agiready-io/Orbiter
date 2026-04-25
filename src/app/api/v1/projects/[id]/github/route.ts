import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { GitHubService } from '@/modules/github/github.service';
import { GitHubSyncAgent } from '@/modules/ai/agents/github-sync.agent';
import { User } from '@/modules/users/user.model';
import { Project } from '@/modules/projects/project.model';
import { decrypt } from '@/shared/lib/encryption';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const projectId = ctx.params.id;
    const syncs = await GitHubService.getSyncHistory(projectId, 20);
    const lastSync = await GitHubService.getLastSyncTime(projectId);

    const project = await Project.findById(projectId).select('githubRepos owner').lean();
    const repoCount = project?.githubRepos?.length ?? 0;

    let githubConnected = false;
    if (project?.owner) {
      const owner = await User.findById(project.owner).select('+githubOAuth').lean();
      githubConnected = !!owner?.githubOAuth?.accessToken;
    }

    return {
      data: {
        syncs: syncs.map((s) => ({
          id: s._id.toString(),
          commits: s.commits,
          pullRequests: s.pullRequests ?? [],
          summary: s.summary,
          lastSyncAt: s.lastSyncAt,
          createdAt: s.createdAt,
        })),
        lastSyncAt: lastSync,
        repoCount,
        githubConnected,
      },
    };
  },
});

export const POST = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  handler: async (_req, ctx) => {
    const projectId = ctx.params.id;
    const project = await Project.findById(projectId).select('githubRepos owner').lean();

    if (!project?.githubRepos?.length) {
      return { data: { error: 'No GitHub repos configured' }, status: 400 };
    }

    const owner = await User.findById(project.owner).select('+githubOAuth').lean();
    if (!owner?.githubOAuth?.accessToken) {
      return { data: { error: 'Project owner has not connected GitHub' }, status: 400 };
    }

    const [iv, authTag, encrypted] = owner.githubOAuth.accessToken.split(':');
    const githubToken = decrypt(encrypted, iv, authTag);

    const result = await GitHubSyncAgent.syncProject(
      projectId,
      project.githubRepos,
      githubToken,
      project.owner.toString(),
    );

    return { data: result };
  },
});
