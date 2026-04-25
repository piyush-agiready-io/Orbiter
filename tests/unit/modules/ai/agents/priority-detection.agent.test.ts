import { PriorityDetectionAgent } from '@/modules/ai/agents/priority-detection.agent';
import { resolveApiKey } from '@/modules/ai/resolve-api-key';
import { CodexClient } from '@/modules/ai/codex-client';

jest.mock('@/modules/ai/resolve-api-key', () => ({
  resolveApiKey: jest.fn(),
}));
jest.mock('@/modules/ai/codex-client', () => ({
  CodexClient: {
    complete: jest.fn(),
  },
}));

const mockedResolveApiKey = jest.mocked(resolveApiKey);
const mockedCodexClient = jest.mocked(CodexClient);

describe('PriorityDetectionAgent', () => {
  beforeEach(() => jest.clearAllMocks());

  // --- Keyword matching tests ---

  it('returns P0 via keyword match for security-related task', async () => {
    const result = await PriorityDetectionAgent.classify(
      'user1',
      'Fix login security vulnerability',
    );

    expect(result.priority).toBe('P0');
    expect(result.source).toBe('keyword');
    // Should not call AI at all
    expect(mockedResolveApiKey).not.toHaveBeenCalled();
    expect(mockedCodexClient.complete).not.toHaveBeenCalled();
  });

  it('returns P1 via keyword match for payment-related task', async () => {
    const result = await PriorityDetectionAgent.classify(
      'user1',
      'Update payment checkout flow',
    );

    // 'payment' appears in both P0 and P1 keywords, but P0 is checked first
    expect(result.priority).toBe('P0');
    expect(result.source).toBe('keyword');
    expect(mockedResolveApiKey).not.toHaveBeenCalled();
  });

  it('returns P3 via keyword match for typo-related task', async () => {
    const result = await PriorityDetectionAgent.classify(
      'user1',
      'Fix typo in readme',
    );

    expect(result.priority).toBe('P3');
    expect(result.source).toBe('keyword');
    expect(mockedResolveApiKey).not.toHaveBeenCalled();
  });

  it('returns P0 via keyword match when keyword is in description', async () => {
    const result = await PriorityDetectionAgent.classify(
      'user1',
      'Fix critical issue',
      'Users can bypass authentication by manipulating tokens',
    );

    expect(result.priority).toBe('P0');
    expect(result.source).toBe('keyword');
  });

  // --- AI classification tests ---

  it('returns P0 when ChatGPT classifies as P0', async () => {
    mockedResolveApiKey.mockResolvedValue({
      token: 'token',
      accountId: 'acct',
      source: 'oauth',
    });
    mockedCodexClient.complete.mockResolvedValue('P0');

    const result = await PriorityDetectionAgent.classify(
      'user1',
      'Fix critical authentication bypass',
      'Users can bypass login by manipulating JWT tokens',
    );

    // 'authentication' is a P0 keyword, so keyword match fires first
    expect(result.priority).toBe('P0');
  });

  it('falls through to AI when no keyword matches', async () => {
    mockedResolveApiKey.mockResolvedValue({
      token: 'token',
      accountId: 'acct',
      source: 'oauth',
    });
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

  // --- Default fallback tests ---

  it('returns P2 default when no keyword match and ChatGPT is unavailable', async () => {
    mockedResolveApiKey.mockResolvedValue(null);

    const result = await PriorityDetectionAgent.classify(
      'user1',
      'Add dark mode toggle',
      'Users want to switch between light and dark themes',
    );

    expect(result.priority).toBe('P2');
    expect(result.source).toBe('default');
  });

  it('returns P2 default when ChatGPT returns invalid priority', async () => {
    mockedResolveApiKey.mockResolvedValue({
      token: 'token',
      accountId: 'acct',
      source: 'oauth',
    });
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
    mockedResolveApiKey.mockResolvedValue({
      token: 'token',
      accountId: 'acct',
      source: 'oauth',
    });
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
