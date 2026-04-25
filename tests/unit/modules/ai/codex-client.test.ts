import { CodexClient } from '@/modules/ai/codex-client';

jest.mock('@/config/env', () => ({
  env: {},
}));

global.fetch = jest.fn();

function mockSSEResponse(text: string) {
  const sseData = [
    `data: ${JSON.stringify({ type: 'response.output_text.delta', delta: text })}`,
    'data: [DONE]',
  ].join('\n');

  return {
    ok: true,
    text: jest.fn().mockResolvedValue(sseData),
  };
}

describe('CodexClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends request with correct headers and body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockSSEResponse('Result text'));

    const result = await CodexClient.complete({
      accessToken: 'token-123',
      accountId: 'acct_abc',
      instructions: 'You are a helpful assistant.',
      input: 'Classify this task.',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('codex/responses'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
          'chatgpt-account-id': 'acct_abc',
        }),
      }),
    );
    expect(result).toBe('Result text');
  });

  it('throws when no accountId provided', async () => {
    await expect(
      CodexClient.complete({
        accessToken: 'token-123',
        instructions: 'test',
        input: 'test',
      }),
    ).rejects.toThrow('ChatGPT Account ID is required');
  });

  it('throws on non-OK response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue('Unauthorized'),
    });

    await expect(
      CodexClient.complete({
        accessToken: 'bad-token',
        accountId: 'acct_abc',
        instructions: 'test',
        input: 'test',
      }),
    ).rejects.toThrow('Codex API failed');
  });

  it('throws when SSE stream returns empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('data: [DONE]\n'),
    });

    await expect(
      CodexClient.complete({
        accessToken: 'token-123',
        accountId: 'acct_abc',
        instructions: 'test',
        input: 'test',
      }),
    ).rejects.toThrow('Codex API returned empty response');
  });

  it('uses custom model when specified', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockSSEResponse('OK'));

    await CodexClient.complete({
      accessToken: 'token-123',
      accountId: 'acct_abc',
      instructions: 'test',
      input: 'test',
      model: 'gpt-4o-mini',
    });

    const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
    const body = JSON.parse(callArgs.body);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.stream).toBe(true);
  });

  it('concatenates multiple SSE deltas', async () => {
    const sseData = [
      `data: ${JSON.stringify({ type: 'response.output_text.delta', delta: 'Hello ' })}`,
      `data: ${JSON.stringify({ type: 'response.output_text.delta', delta: 'World' })}`,
      'data: [DONE]',
    ].join('\n');

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(sseData),
    });

    const result = await CodexClient.complete({
      accessToken: 'token-123',
      accountId: 'acct_abc',
      instructions: 'test',
      input: 'test',
    });

    expect(result).toBe('Hello World');
  });
});
