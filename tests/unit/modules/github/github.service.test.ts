import { GitHubService } from '@/modules/github/github.service';

// Mock global fetch
global.fetch = jest.fn();

describe('GitHubService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('fetchRecentCommits', () => {
    it('returns parsed commits from GitHub API', async () => {
      const mockCommits = [
        {
          sha: 'abc123',
          commit: {
            message: 'feat: add login page',
            author: { name: 'Dev', date: '2026-04-20T10:00:00Z' },
          },
        },
        {
          sha: 'def456',
          commit: {
            message: 'fix: resolve auth bug',
            author: { name: 'Dev2', date: '2026-04-20T11:00:00Z' },
          },
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockCommits),
      });

      const commits = await GitHubService.fetchRecentCommits(
        'owner',
        'repo',
        'ghp_token123',
      );

      expect(commits).toHaveLength(2);
      expect(commits[0].sha).toBe('abc123');
      expect(commits[0].message).toBe('feat: add login page');
      expect(commits[0].author).toBe('Dev');
    });

    it('returns empty array on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('Not Found'),
      });

      const commits = await GitHubService.fetchRecentCommits(
        'owner',
        'repo',
        'ghp_token123',
      );
      expect(commits).toEqual([]);
    });
  });

  describe('extractTaskId', () => {
    it('extracts task ID from feature branch name', () => {
      expect(GitHubService.extractTaskId('feature/TASK-123-add-login')).toBe('123');
    });

    it('extracts task ID from fix branch name', () => {
      expect(GitHubService.extractTaskId('fix/TASK-456-auth-bug')).toBe('456');
    });

    it('extracts task ID from commit message with "fixes #N"', () => {
      expect(GitHubService.extractTaskId('fixes #789')).toBe('789');
    });

    it('extracts task ID from commit message with "closes #N"', () => {
      expect(GitHubService.extractTaskId('closes #42')).toBe('42');
    });

    it('returns null when no task ID found', () => {
      expect(GitHubService.extractTaskId('some random text')).toBeNull();
    });
  });
});
