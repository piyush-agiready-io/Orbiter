import { PriorityDetectionAgent } from '@/modules/ai/agents/priority-detection.agent';
import { resolveOrgApiKey } from '@/modules/ai/resolve-org-api-key';
import { CodexClient } from '@/modules/ai/codex-client';

jest.mock('@/modules/ai/resolve-org-api-key', () => ({
  resolveOrgApiKey: jest.fn(),
}));
jest.mock('@/modules/ai/codex-client', () => ({
  CodexClient: {
    complete: jest.fn(),
  },
}));

const mockedResolveOrgApiKey = jest.mocked(resolveOrgApiKey);
const mockedCodexClient = jest.mocked(CodexClient);

describe('PriorityDetectionAgent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns P0 via keyword fallback for security-related task when AI unavailable', async () => {
    mockedResolveOrgApiKey.mockResolvedValue(null);

    const result = await PriorityDetectionAgent.classify(
      'user1',
      'Fix login security vulnerability',
    );

    expect(result.priority).toBe('P0');
    expect(result.source).toBe('keyword');
  });

  it('returns P0 via keyword fallback for payment-related task when AI unavailable', async () => {
    mockedResolveOrgApiKey.mockResolvedValue(null);

    const result = await PriorityDetectionAgent.classify(
      'user1',
      'Update payment checkout flow',
    );

    expect(result.priority).toBe('P0');
    expect(result.source).toBe('keyword');
  });

  it('returns P3 via keyword fallback for typo-related task when AI unavailable', async () => {
    mockedResolveOrgApiKey.mockResolvedValue(null);

    const result = await PriorityDetectionAgent.classify(
      'user1',
      'Fix typo in readme',
    );

    expect(result.priority).toBe('P3');
    expect(result.source).toBe('keyword');
  });

  it('returns P0 via keyword fallback when keyword is in description', async () => {
    mockedResolveOrgApiKey.mockResolvedValue(null);

    const result = await PriorityDetectionAgent.classify(
      'user1',
      'Fix critical issue',
      'Users can bypass authentication by manipulating tokens',
    );

    expect(result.priority).toBe('P0');
    expect(result.source).toBe('keyword');
  });

  it('falls through to AI when no keyword matches', async () => {
    mockedResolveOrgApiKey.mockResolvedValue({ token: 'token', accountId: 'acct' });
    mockedCodexClient.complete.mockResolvedValue('P1');

    const result = await PriorityDetectionAgent.classify(
      'user1',
      'Investigate slow database queries on dashboard',
      'The dashboard page takes 10 seconds to load',
    );

    expect(result.priority).toBe('P1');
    expect(result.source).toBe('ai');
    expect(mockedCodexClient.complete).toHaveBeenCalled();
  });

  it('returns P2 default when no keyword match and ChatGPT is unavailable', async () => {
    mockedResolveOrgApiKey.mockResolvedValue(null);

    const result = await PriorityDetectionAgent.classify(
      'user1',
      'Add dark mode toggle',
      'Users want to switch between light and dark themes',
    );

    expect(result.priority).toBe('P2');
    expect(result.source).toBe('default');
  });

  it('returns P2 default when ChatGPT returns invalid priority', async () => {
    mockedResolveOrgApiKey.mockResolvedValue({ token: 'token', accountId: 'acct' });
    mockedCodexClient.complete.mockResolvedValue('URGENT');

    const result = await PriorityDetectionAgent.classify(
      'user1',
      'Some unclassifiable task',
      'No keywords here at all',
    );

    expect(result.priority).toBe('P2');
    expect(result.source).toBe('default');
  });

  it('returns P2 default when ChatGPT call throws', async () => {
    mockedResolveOrgApiKey.mockResolvedValue({ token: 'token', accountId: 'acct' });
    mockedCodexClient.complete.mockRejectedValue(new Error('Network error'));

    const result = await PriorityDetectionAgent.classify(
      'user1',
      'Some unclassifiable task',
      'No keywords here at all',
    );

    expect(result.priority).toBe('P2');
    expect(result.source).toBe('default');
  });
});
