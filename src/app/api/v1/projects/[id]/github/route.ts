import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { GitHubService } from '@/modules/github/github.service';
import { GitHubSyncAgent } from '@/modules/ai/agents/github-sync.agent';
import { Project } from '@/modules/projects/project.model';
import { decrypt } from '@/shared/lib/encryption';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const projectId = ctx.params.id;
    const syncs = await GitHubService.getSyncHistory(projectId, 20);
    const lastSync = await GitHubService.getLastSyncTime(projectId);

    const project = await Project.findById(projectId)
      .select('+githubOAuth githubRepos')
      .lean();

    const repoCount = project?.githubRepos?.length ?? 0;
    const githubConnected = !!project?.githubOAuth?.accessToken;
    const githubUsername = project?.githubOAuth?.username ?? null;

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
        githubUsername,
      },
    };
  },
});

export const POST = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  handler: async (_req, ctx) => {
    const projectId = ctx.params.id;
    const project = await Project.findById(projectId)
      .select('+githubOAuth githubRepos owner')
      .lean();

    if (!project?.githubRepos?.length) {
      return { data: { error: 'No GitHub repos configured' }, status: 400 };
    }

    if (!project.githubOAuth?.accessToken) {
      return { data: { error: 'GitHub not connected for this project' }, status: 400 };
    }

    const [iv, authTag, encrypted] = project.githubOAuth.accessToken.split(':');
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
