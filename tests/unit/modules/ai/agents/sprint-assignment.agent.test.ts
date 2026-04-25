import { SprintAssignmentAgent } from '@/modules/ai/agents/sprint-assignment.agent';
import { resolveApiKey } from '@/modules/ai/resolve-api-key';
import { CodexClient } from '@/modules/ai/codex-client';
import { SprintService } from '@/modules/sprints/sprint.service';
import { UserService } from '@/modules/users/user.service';

jest.mock('@/modules/ai/resolve-api-key', () => ({
  resolveApiKey: jest.fn(),
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

const mockedResolveApiKey = jest.mocked(resolveApiKey);
const mockedCodexClient = jest.mocked(CodexClient);
const mockedSprintService = jest.mocked(SprintService);
const mockedUserService = jest.mocked(UserService);

describe('SprintAssignmentAgent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns sprint and assignee suggestion from ChatGPT', async () => {
    mockedResolveApiKey.mockResolvedValue({ token: 'tk', accountId: 'acct', source: 'oauth' });
    mockedSprintService.getActiveSprint.mockResolvedValue({ _id: 'sprint1', name: 'Sprint 5' });
    mockedSprintService.getTaskCountPerMember.mockResolvedValue([
      { userId: 'u1', name: 'Alice', count: 3 },
      { userId: 'u2', name: 'Bob', count: 7 },
    ]);
    mockedUserService.getProjectMembers.mockResolvedValue([
      { _id: 'u1', name: 'Alice', skills: ['frontend', 'react'] },
      { _id: 'u2', name: 'Bob', skills: ['backend', 'node'] },
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
    expect(result!.reason).toContain('Alice');
  });

  it('returns null when ChatGPT is unavailable', async () => {
    mockedResolveApiKey.mockResolvedValue(null);

    const result = await SprintAssignmentAgent.suggest(
      'user1',
      'proj1',
      { title: 'Some task', priority: 'P2', type: 'chore' },
    );

    expect(result).toBeNull();
  });

  it('returns null when no active sprint exists', async () => {
    mockedResolveApiKey.mockResolvedValue({ token: 'tk', accountId: 'acct', source: 'oauth' });
    mockedSprintService.getActiveSprint.mockResolvedValue(null);

    const result = await SprintAssignmentAgent.suggest(
      'user1',
      'proj1',
      { title: 'Some task', priority: 'P2', type: 'chore' },
    );

    expect(result).toBeNull();
  });
});
