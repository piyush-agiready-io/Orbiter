import type { IGitHubCommit, GitHubRepo } from './github.types';
import { GitHubSyncModel } from './github.model';
import { GITHUB_SYNC_CONSTANTS } from '@/shared/utils/constants';

export const GitHubService = {
  /**
   * Fetch recent commits from a GitHub repository.
   * Uses GitHub REST API v3.
   */
  async fetchRecentCommits(
    owner: string,
    repo: string,
    token: string,
    since?: Date,
  ): Promise<IGitHubCommit[]> {
    try {
      const params = new URLSearchParams({
        per_page: String(GITHUB_SYNC_CONSTANTS.MAX_COMMITS_PER_REPO),
      });
      if (since) params.set('since', since.toISOString());

      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      if (!res.ok) {
        console.error(`GitHub API error for ${owner}/${repo}: ${res.status}`);
        return [];
      }

      const data = (await res.json()) as Array<{
        sha: string;
        commit: {
          message: string;
          author: { name: string; date: string };
        };
      }>;

      return data.map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author.name,
        repo: `${owner}/${repo}`,
        branch: '', // Populated when fetching per-branch
        date: new Date(c.commit.author.date),
      }));
    } catch (error) {
      console.error(`Failed to fetch commits for ${owner}/${repo}:`, error);
      return [];
    }
  },

  /**
   * Fetch commits from all repos associated with a project.
   */
  async fetchCommitsForProject(
    repos: GitHubRepo[],
    token: string,
    since?: Date,
  ): Promise<IGitHubCommit[]> {
    const allCommits: IGitHubCommit[] = [];

    for (const repo of repos) {
      const commits = await this.fetchRecentCommits(
        repo.owner,
        repo.repo,
        token,
        since,
      );
      allCommits.push(...commits);
    }

    // Sort by date descending
    return allCommits.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  },

  /**
   * Store a sync result in the database.
   */
  async storeSync(projectId: string, commits: IGitHubCommit[], summary?: string) {
    return GitHubSyncModel.create({
      project: projectId,
      commits,
      summary,
      lastSyncAt: new Date(),
    });
  },

  /**
   * Get the last sync time for a project.
   */
  async getLastSyncTime(projectId: string): Promise<Date | null> {
    const lastSync = await GitHubSyncModel.findOne({ project: projectId })
      .sort({ createdAt: -1 })
      .select('lastSyncAt')
      .lean();
    return lastSync?.lastSyncAt ?? null;
  },

  /**
   * Extract a task ID from a branch name or commit message.
   * Patterns: feature/TASK-123-description, fixes #123, closes #123, TASK-123
   */
  extractTaskId(text: string): string | null {
    for (const pattern of GITHUB_SYNC_CONSTANTS.TASK_ID_PATTERNS) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  },
};
