import { GitHubService } from '@/modules/github/github.service';
import { resolveOrgApiKey } from '@/modules/ai/resolve-org-api-key';
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

const SUMMARY_INSTRUCTIONS = `You are a development team digest writer for the Orbiter project management platform. You will receive NEW commits and PRs from the latest sync and PREVIOUS sync summaries for context.

Output a single JSON object (no prose, no markdown fences) with this exact shape:
{
  "headline": "<one short sentence, <= 90 chars, summarizing what just shipped>",
  "highlights": ["<bullet 1>", "<bullet 2>", "<bullet 3>"],
  "shipped": ["<merged PR title or completed work, plain text>"],
  "in_progress": ["<open PR title or work-in-flight, plain text>"],
  "trajectory": "<one short sentence, <= 100 chars, on momentum compared to previous syncs>"
}

Rules:
- Each highlights bullet is 6–14 words. Synthesize, don't list individual commits.
- shipped[] = merged PRs and completed work. Empty array if none.
- in_progress[] = open PRs and work-in-flight. Empty array if none.
- Use plain text only. No markdown, no emojis, no quote marks around bullets.
- If something is unknown or empty, return an empty array or empty string. Never invent data.
- Output JSON only. Nothing else.`;

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
    const key = await resolveOrgApiKey();
    if (key) {
      try {
        const parts: string[] = [];

        if (commits.length > 0) {
          const commitList = commits
            .slice(0, 30)
            .map((c) => `- ${c.message.split('\n')[0]} (${c.author})`)
            .join('\n');
          parts.push(`NEW COMMITS (${commits.length}):\n${commitList}`);
        }

        if (pullRequests.length > 0) {
          const prList = pullRequests
            .map((pr) => `- #${pr.number} ${pr.title} [${pr.state}] by ${pr.author} (+${pr.additions}/-${pr.deletions})`)
            .join('\n');
          parts.push(`NEW PULL REQUESTS (${pullRequests.length}):\n${prList}`);
        }

        const previousSyncs = await GitHubService.getSyncHistory(projectId, 5);
        if (previousSyncs.length > 0) {
          const historyLines = previousSyncs
            .filter((s) => s.summary)
            .slice(0, 3)
            .map((s) => `- ${s.summary}`)
            .join('\n');
          if (historyLines) {
            parts.push(`PREVIOUS SYNC SUMMARIES (for context):\n${historyLines}`);
          }
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
