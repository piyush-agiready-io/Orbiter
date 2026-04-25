import { inngest } from '@/shared/lib/inngest';
import { connectDB } from '@/shared/database/connection';

export const githubSyncFunction = inngest.createFunction(
  {
    id: 'github-sync',
    name: 'GitHub Commit Sync',
    triggers: [{ cron: '0 */6 * * *' }],
  },
  async ({ step }) => {
    await step.run('connect-db', async () => {
      await connectDB();
    });

    const results = await step.run('sync-all-projects', async () => {
      const { Project } = await import('@/modules/projects/project.model');
      const { User } = await import('@/modules/users/user.model');
      const { decrypt } = await import('@/shared/lib/encryption');
      const { GitHubSyncAgent } = await import('./github-sync.agent');

      const projects = await Project.find({
        'githubRepos.0': { $exists: true },
        status: 'active',
      })
        .select('_id owner githubRepos')
        .lean();

      const syncResults = [];

      for (const project of projects) {
        try {
          const ownerId = project.owner.toString();

          const owner = await User.findById(ownerId).select('+githubOAuth').lean();
          if (!owner?.githubOAuth?.accessToken) {
            syncResults.push({
              projectId: project._id.toString(),
              skipped: true,
              reason: 'No GitHub token for project owner',
            });
            continue;
          }

          const [iv, authTag, encrypted] = owner.githubOAuth.accessToken.split(':');
          const githubToken = decrypt(encrypted, iv, authTag);

          const result = await GitHubSyncAgent.syncProject(
            project._id.toString(),
            project.githubRepos,
            githubToken,
            ownerId,
          );
          syncResults.push(result);
        } catch (error) {
          console.error(`Sync failed for project ${project._id}:`, error);
          syncResults.push({
            projectId: project._id.toString(),
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return {
        projectsProcessed: projects.length,
        results: syncResults,
        timestamp: new Date().toISOString(),
      };
    });

    return results;
  },
);
