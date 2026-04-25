import type { IGitHubCommit, IGitHubPR, GitHubRepo } from './github.types';
import { GitHubSyncModel } from './github.model';
import { GITHUB_SYNC_CONSTANTS } from '@/shared/utils/constants';

const GITHUB_API = 'https://api.github.com';

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
  };
}

export const GitHubService = {
  async validateRepo(owner: string, repo: string, token: string): Promise<boolean> {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
      headers: githubHeaders(token),
    });
    return res.ok;
  },

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
        `${GITHUB_API}/repos/${owner}/${repo}/commits?${params}`,
        { headers: githubHeaders(token) },
      );

      if (!res.ok) {
        console.error(`GitHub API error for ${owner}/${repo}: ${res.status}`);
        return [];
      }

      const data = (await res.json()) as Array<{
        sha: string;
        commit: { message: string; author: { name: string; date: string } };
      }>;

      return data.map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author.name,
        repo: `${owner}/${repo}`,
        branch: '',
        date: new Date(c.commit.author.date),
      }));
    } catch (error) {
      console.error(`Failed to fetch commits for ${owner}/${repo}:`, error);
      return [];
    }
  },

  async fetchPullRequests(
    owner: string,
    repo: string,
    token: string,
    since?: Date,
  ): Promise<IGitHubPR[]> {
    try {
      const params = new URLSearchParams({
        per_page: '30',
        state: 'all',
        sort: 'updated',
        direction: 'desc',
      });

      const res = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/pulls?${params}`,
        { headers: githubHeaders(token) },
      );

      if (!res.ok) return [];

      const data = (await res.json()) as Array<{
        number: number;
        title: string;
        state: string;
        merged_at: string | null;
        user: { login: string };
        html_url: string;
        created_at: string;
        additions: number;
        deletions: number;
      }>;

      const prs: IGitHubPR[] = data
        .filter((pr) => !since || new Date(pr.created_at) >= since)
        .map((pr) => ({
          number: pr.number,
          title: pr.title,
          state: pr.merged_at ? 'merged' : (pr.state as 'open' | 'closed'),
          author: pr.user.login,
          repo: `${owner}/${repo}`,
          url: pr.html_url,
          createdAt: new Date(pr.created_at),
          mergedAt: pr.merged_at ? new Date(pr.merged_at) : undefined,
          additions: pr.additions ?? 0,
          deletions: pr.deletions ?? 0,
        }));

      return prs;
    } catch (error) {
      console.error(`Failed to fetch PRs for ${owner}/${repo}:`, error);
      return [];
    }
  },

  async fetchCommitsForProject(
    repos: GitHubRepo[],
    token: string,
    since?: Date,
  ): Promise<IGitHubCommit[]> {
    const allCommits: IGitHubCommit[] = [];
    for (const repo of repos) {
      const commits = await this.fetchRecentCommits(repo.owner, repo.repo, token, since);
      allCommits.push(...commits);
    }
    return allCommits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async fetchPRsForProject(
    repos: GitHubRepo[],
    token: string,
    since?: Date,
  ): Promise<IGitHubPR[]> {
    const allPRs: IGitHubPR[] = [];
    for (const repo of repos) {
      const prs = await this.fetchPullRequests(repo.owner, repo.repo, token, since);
      allPRs.push(...prs);
    }
    return allPRs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async storeSync(
    projectId: string,
    commits: IGitHubCommit[],
    pullRequests: IGitHubPR[],
    summary?: string,
  ) {
    return GitHubSyncModel.create({
      project: projectId,
      commits,
      pullRequests,
      summary,
      lastSyncAt: new Date(),
    });
  },

  async getSyncHistory(projectId: string, limit = 10) {
    return GitHubSyncModel.find({ project: projectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  },

  async getLastSyncTime(projectId: string): Promise<Date | null> {
    const lastSync = await GitHubSyncModel.findOne({ project: projectId })
      .sort({ createdAt: -1 })
      .select('lastSyncAt')
      .lean();
    return lastSync?.lastSyncAt ?? null;
  },

  extractTaskId(text: string): string | null {
    for (const pattern of GITHUB_SYNC_CONSTANTS.TASK_ID_PATTERNS) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  },
};
