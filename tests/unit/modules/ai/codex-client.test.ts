import { CodexClient } from '@/modules/ai/codex-client';

// Mock global fetch
global.fetch = jest.fn();

describe('CodexClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends request with correct headers and body', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        output: [{ type: 'message', content: [{ type: 'output_text', text: 'Result text' }] }],
      }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

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
          'ChatGPT-Account-ID': 'acct_abc',
        }),
      }),
    );
    expect(result).toBe('Result text');
  });

  it('sends request without ChatGPT-Account-ID when no accountId', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        output: [{ type: 'message', content: [{ type: 'output_text', text: 'OK' }] }],
      }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await CodexClient.complete({
      accessToken: 'token-123',
      instructions: 'test',
      input: 'test',
    });

    const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(callArgs.headers['ChatGPT-Account-ID']).toBeUndefined();
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
        instructions: 'test',
        input: 'test',
      }),
    ).rejects.toThrow('Codex API request failed');
  });

  it('returns empty string when output is missing', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const result = await CodexClient.complete({
      accessToken: 'token-123',
      instructions: 'test',
      input: 'test',
    });

    expect(result).toBe('');
  });

  it('uses custom model when specified', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        output: [{ type: 'message', content: [{ type: 'output_text', text: 'OK' }] }],
      }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await CodexClient.complete({
      accessToken: 'token-123',
      instructions: 'test',
      input: 'test',
      model: 'gpt-4o-mini',
    });

    const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
    const body = JSON.parse(callArgs.body);
    expect(body.model).toBe('gpt-4o-mini');
  });
});
