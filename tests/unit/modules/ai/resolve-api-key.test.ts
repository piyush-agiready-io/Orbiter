jest.mock('@/config/env', () => ({
  env: {
    ENCRYPTION_KEY: 'a'.repeat(64),
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_ACCESS_SECRET: 'test-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
  },
}));

jest.mock('@/shared/database/connection', () => ({
  connectDB: jest.fn(),
}));

jest.mock('@/shared/middleware/api-handler', () => {
  class NotFoundError extends Error {
    constructor(resource: string) {
      super(`${resource} not found`);
      this.name = 'NotFoundError';
    }
  }
  return { NotFoundError };
});

jest.mock('@/modules/ai/openai-connection.service', () => ({
  OpenAIConnectionService: {
    getValidAccessToken: jest.fn(),
  },
}));

import { resolveApiKey } from '@/modules/ai/resolve-api-key';
import { OpenAIConnectionService } from '@/modules/ai/openai-connection.service';

const mockedConnectionService = jest.mocked(OpenAIConnectionService);

describe('resolveApiKey', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns OAuth token when available', async () => {
    mockedConnectionService.getValidAccessToken.mockResolvedValue({
      accessToken: 'oauth-token-123',
      accountId: 'acct_abc',
    });

    const result = await resolveApiKey('user1');
    expect(result).toEqual({
      token: 'oauth-token-123',
      accountId: 'acct_abc',
      source: 'oauth',
    });
  });

  it('returns manual source when no accountId', async () => {
    mockedConnectionService.getValidAccessToken.mockResolvedValue({
      accessToken: 'sk-manual-key',
    });

    const result = await resolveApiKey('user1');
    expect(result).toEqual({
      token: 'sk-manual-key',
      accountId: undefined,
      source: 'manual',
    });
  });

  it('returns null when no token is available', async () => {
    mockedConnectionService.getValidAccessToken.mockResolvedValue(null);

    const result = await resolveApiKey('user1');
    expect(result).toBeNull();
  });
});
