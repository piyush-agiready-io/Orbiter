import { GitHubSyncAgent } from '@/modules/ai/agents/github-sync.agent';
import { GitHubService } from '@/modules/github/github.service';
import { resolveApiKey } from '@/modules/ai/resolve-api-key';
import { CodexClient } from '@/modules/ai/codex-client';
import { StatusUpdateAgent } from '@/modules/ai/agents/status-update.agent';

jest.mock('@/modules/github/github.service', () => ({
  GitHubService: {
    fetchCommitsForProject: jest.fn(),
    storeSync: jest.fn(),
    getLastSyncTime: jest.fn(),
  },
}));
jest.mock('@/modules/ai/resolve-api-key', () => ({
  resolveApiKey: jest.fn(),
}));
jest.mock('@/modules/ai/codex-client', () => ({
  CodexClient: { complete: jest.fn() },
}));
jest.mock('@/modules/ai/agents/status-update.agent', () => ({
  StatusUpdateAgent: { processBatch: jest.fn() },
}));
jest.mock('@/modules/notifications/notification.service', () => ({
  NotificationService: { create: jest.fn(), notifyProjectMembers: jest.fn() },
}));

const mockedGitHubService = jest.mocked(GitHubService);
const mockedResolveApiKey = jest.mocked(resolveApiKey);
const mockedCodexClient = jest.mocked(CodexClient);
const mockedStatusUpdateAgent = jest.mocked(StatusUpdateAgent);

describe('GitHubSyncAgent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches commits, generates summary, stores sync, and triggers status updates', async () => {
    const commits = [
      { sha: 'a1', message: 'feat: add auth', author: 'Dev', repo: 'o/r', branch: 'main', date: new Date() },
      { sha: 'a2', message: 'fix: resolve bug', author: 'Dev', repo: 'o/r', branch: 'main', date: new Date() },
    ];

    mockedGitHubService.getLastSyncTime.mockResolvedValue(null);
    mockedGitHubService.fetchCommitsForProject.mockResolvedValue(commits);
    mockedGitHubService.storeSync.mockResolvedValue({ _id: 'sync1' });
    mockedResolveApiKey.mockResolvedValue({ token: 'tk', accountId: 'acct', source: 'oauth' });
    mockedCodexClient.complete.mockResolvedValue('Added authentication and fixed a bug.');
    mockedStatusUpdateAgent.processBatch.mockResolvedValue([]);

    const result = await GitHubSyncAgent.syncProject(
      'proj1',
      [{ owner: 'o', repo: 'r' }],
      'ghp_token',
      'user1',
    );

    expect(result.commitCount).toBe(2);
    expect(result.summary).toBe('Added authentication and fixed a bug.');
    expect(mockedGitHubService.storeSync).toHaveBeenCalled();
    expect(mockedStatusUpdateAgent.processBatch).toHaveBeenCalledWith('proj1', commits);
  });

  it('stores sync without summary when ChatGPT is unavailable', async () => {
    const commits = [
      { sha: 'b1', message: 'chore: update deps', author: 'Dev', repo: 'o/r', branch: 'main', date: new Date() },
    ];

    mockedGitHubService.getLastSyncTime.mockResolvedValue(null);
    mockedGitHubService.fetchCommitsForProject.mockResolvedValue(commits);
    mockedGitHubService.storeSync.mockResolvedValue({ _id: 'sync2' });
    mockedResolveApiKey.mockResolvedValue(null);
    mockedStatusUpdateAgent.processBatch.mockResolvedValue([]);

    const result = await GitHubSyncAgent.syncProject(
      'proj1',
      [{ owner: 'o', repo: 'r' }],
      'ghp_token',
      'user1',
    );

    expect(result.commitCount).toBe(1);
    expect(result.summary).toBeUndefined();
  });

  it('returns zero commits when no new commits found', async () => {
    mockedGitHubService.getLastSyncTime.mockResolvedValue(new Date());
    mockedGitHubService.fetchCommitsForProject.mockResolvedValue([]);

    const result = await GitHubSyncAgent.syncProject(
      'proj1',
      [{ owner: 'o', repo: 'r' }],
      'ghp_token',
      'user1',
    );

    expect(result.commitCount).toBe(0);
    expect(mockedGitHubService.storeSync).not.toHaveBeenCalled();
  });
});
