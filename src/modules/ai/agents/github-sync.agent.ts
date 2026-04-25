import { GitHubService } from '@/modules/github/github.service';
import { resolveApiKey } from '@/modules/ai/resolve-api-key';
import { CodexClient } from '@/modules/ai/codex-client';
import { StatusUpdateAgent } from './status-update.agent';
import type { GitHubRepo } from '@/modules/github/github.types';

interface SyncResult {
  projectId: string;
  commitCount: number;
  prCount: number;
  summary?: string;
  statusUpdates: number;
}

const SUMMARY_INSTRUCTIONS = `You are a development team digest writer for the Orbiter project management platform. Given a list of git commits and pull requests, write a clear 3-5 sentence summary of what was accomplished. Group related work together. Highlight: features shipped, bugs fixed, and improvements made. Mention notable PRs by title. Use plain language a project manager would understand. Do not list individual commits — synthesize the work.`;

export const GitHubSyncAgent = {
  async syncProject(
    projectId: string,
    repos: GitHubRepo[],
    githubToken: string,
    userId: string,
  ): Promise<SyncResult> {
    const lastSync = await GitHubService.getLastSyncTime(projectId);

    const [commits, pullRequests] = await Promise.all([
      GitHubService.fetchCommitsForProject(repos, githubToken, lastSync ?? undefined),
      GitHubService.fetchPRsForProject(repos, githubToken, lastSync ?? undefined),
    ]);

    if (commits.length === 0 && pullRequests.length === 0) {
      return { projectId, commitCount: 0, prCount: 0, statusUpdates: 0 };
    }

    let summary: string | undefined;
    const key = await resolveApiKey(userId);
    if (key) {
      try {
        const parts: string[] = [];

        if (commits.length > 0) {
          const commitList = commits
            .slice(0, 30)
            .map((c) => `- ${c.message} (${c.author})`)
            .join('\n');
          parts.push(`Commits (${commits.length}):\n${commitList}`);
        }

        if (pullRequests.length > 0) {
          const prList = pullRequests
            .map((pr) => `- #${pr.number} ${pr.title} [${pr.state}] by ${pr.author} (+${pr.additions}/-${pr.deletions})`)
            .join('\n');
          parts.push(`Pull Requests (${pullRequests.length}):\n${prList}`);
        }

        summary = await CodexClient.complete({
          accessToken: key.token,
          accountId: key.accountId,
          instructions: SUMMARY_INSTRUCTIONS,
          input: parts.join('\n\n'),
        });
      } catch (error) {
        console.error('Failed to generate sync summary:', error instanceof Error ? error.message : error);
      }
    }

    await GitHubService.storeSync(projectId, commits, pullRequests, summary);

    const statusResults = await StatusUpdateAgent.processBatch(projectId, commits);
    const statusUpdates = statusResults.filter((r) => r.updated).length;

    try {
      const { NotificationService } = await import(
        '@/modules/notifications/notification.service'
      );

      const message = summary ??
        `${commits.length} commit(s) and ${pullRequests.length} PR(s) synced.`;

      await NotificationService.notifyProjectMembers(
        projectId,
        '',
        'github_digest',
        'GitHub Sync Complete',
        message,
        `/projects/${projectId}/github`,
      );
    } catch (error) {
      console.error('Failed to create sync notification:', error);
    }

    return {
      projectId,
      commitCount: commits.length,
      prCount: pullRequests.length,
      summary,
      statusUpdates,
    };
  },
};
