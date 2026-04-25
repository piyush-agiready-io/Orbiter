import { SprintAssignmentAgent } from '@/modules/ai/agents/sprint-assignment.agent';
import { resolveOrgApiKey } from '@/modules/ai/resolve-org-api-key';
import { CodexClient } from '@/modules/ai/codex-client';

jest.mock('@/modules/ai/resolve-org-api-key', () => ({
  resolveOrgApiKey: jest.fn(),
}));
jest.mock('@/modules/ai/codex-client', () => ({
  CodexClient: { complete: jest.fn() },
}));
jest.mock('@/modules/sprints/sprint.service', () => ({
  SprintService: {
    getActiveSprint: jest.fn(),
    getTaskCountPerMember: jest.fn(),
  },
}));
jest.mock('@/modules/users/user.service', () => ({
  UserService: {
    getProjectMembers: jest.fn(),
  },
}));

const mockedResolveOrgApiKey = jest.mocked(resolveOrgApiKey);
const mockedCodexClient = jest.mocked(CodexClient);

describe('SprintAssignmentAgent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns sprint and assignee suggestion from ChatGPT', async () => {
    const { SprintService } = await import('@/modules/sprints/sprint.service');
    const { UserService } = await import('@/modules/users/user.service');
    const mockedSprintService = jest.mocked(SprintService);
    const mockedUserService = jest.mocked(UserService);

    mockedResolveOrgApiKey.mockResolvedValue({ token: 'tk', accountId: 'acct' });
    mockedSprintService.getActiveSprint.mockResolvedValue({ _id: 'sprint1', name: 'Sprint 5' });
    mockedSprintService.getTaskCountPerMember.mockResolvedValue([
      { userId: 'u1', name: 'Alice', count: 3 },
      { userId: 'u2', name: 'Bob', count: 7 },
    ]);
    mockedUserService.getProjectMembers.mockResolvedValue([
      { _id: { toString: () => 'u1' }, name: 'Alice', skills: ['frontend', 'react'] },
      { _id: { toString: () => 'u2' }, name: 'Bob', skills: ['backend', 'node'] },
    ]);
    mockedCodexClient.complete.mockResolvedValue(JSON.stringify({
      sprintId: 'sprint1',
      assigneeId: 'u1',
      reason: 'Alice has fewer tasks and frontend skills match this UI task.',
    }));

    const result = await SprintAssignmentAgent.suggest(
      'user1',
      'proj1',
      { title: 'Build login form', priority: 'P1', type: 'feature' },
    );

    expect(result).not.toBeNull();
    expect(result!.sprintId).toBe('sprint1');
    expect(result!.assigneeId).toBe('u1');
    expect(result!.assigneeName).toBe('Alice');
    expect(result!.reason).toContain('Alice');
  });

  it('returns null when ChatGPT is unavailable', async () => {
    mockedResolveOrgApiKey.mockResolvedValue(null);

    const result = await SprintAssignmentAgent.suggest(
      'user1',
      'proj1',
      { title: 'Some task', priority: 'P2', type: 'chore' },
    );

    expect(result).toBeNull();
  });

  it('returns null when no active sprint exists', async () => {
    const { SprintService } = await import('@/modules/sprints/sprint.service');
    const mockedSprintService = jest.mocked(SprintService);

    mockedResolveOrgApiKey.mockResolvedValue({ token: 'tk', accountId: 'acct' });
    mockedSprintService.getActiveSprint.mockResolvedValue(null);

    const result = await SprintAssignmentAgent.suggest(
      'user1',
      'proj1',
      { title: 'Some task', priority: 'P2', type: 'chore' },
    );

    expect(result).toBeNull();
  });
});
