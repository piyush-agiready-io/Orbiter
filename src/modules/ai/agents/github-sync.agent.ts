import { GitHubService } from '@/modules/github/github.service';
import { resolveApiKey } from '@/modules/ai/resolve-api-key';
import { CodexClient } from '@/modules/ai/codex-client';
import { StatusUpdateAgent } from './status-update.agent';
import type { GitHubRepo } from '@/modules/github/github.types';

interface SyncResult {
  projectId: string;
  commitCount: number;
  summary?: string;
  statusUpdates: number;
}

const SUMMARY_INSTRUCTIONS = `You are a development team digest writer. Given a list of git commits, write a concise 2-3 sentence summary of what was accomplished. Focus on features added, bugs fixed, and improvements made. Use plain language a project manager would understand. Do not list individual commits.`;

export const GitHubSyncAgent = {
  /**
   * Sync commits for a single project from its connected GitHub repos.
   * Called by the Vercel Cron route for each project with GitHub repos.
   */
  async syncProject(
    projectId: string,
    repos: GitHubRepo[],
    githubToken: string,
    userId: string,
  ): Promise<SyncResult> {
    // Get last sync time to only fetch new commits
    const lastSync = await GitHubService.getLastSyncTime(projectId);

    // Fetch new commits from all repos
    const commits = await GitHubService.fetchCommitsForProject(
      repos,
      githubToken,
      lastSync ?? undefined,
    );

    if (commits.length === 0) {
      return { projectId, commitCount: 0, statusUpdates: 0 };
    }

    // Generate AI summary if ChatGPT is available
    let summary: string | undefined;
    const key = await resolveApiKey(userId);
    if (key) {
      try {
        const commitList = commits
          .map((c) => `- ${c.message} (${c.author})`)
          .join('\n');

        summary = await CodexClient.complete({
          accessToken: key.token,
          accountId: key.accountId,
          instructions: SUMMARY_INSTRUCTIONS,
          input: `Commits since last sync:\n${commitList}`,
        });
      } catch (error) {
        console.error('Failed to generate commit summary:', error);
      }
    }

    // Store the sync record
    await GitHubService.storeSync(projectId, commits, summary);

    // Run status update agent on the commits
    const statusResults = await StatusUpdateAgent.processBatch(projectId, commits);
    const statusUpdates = statusResults.filter((r) => r.updated).length;

    // Create notification for the team
    try {
      const { NotificationService } = await import(
        '@/modules/notifications/notification.service'
      );
      await NotificationService.notifyProjectMembers(
        projectId,
        '', // no user to exclude — cron job triggered
        'github_digest',
        'GitHub Sync Complete',
        summary ?? `${commits.length} new commit(s) synced.`,
        `/projects/${projectId}`,
      );
    } catch (error) {
      console.error('Failed to create sync notification:', error);
    }

    return {
      projectId,
      commitCount: commits.length,
      summary,
      statusUpdates,
    };
  },
};
