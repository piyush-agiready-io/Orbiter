// Mock env before any imports that might trigger env validation
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

import { OpenAIConnectionService } from '@/modules/ai/openai-connection.service';
import { OpenAIConnectionModel } from '@/modules/ai/openai-connection.model';
import { OpenAIDeviceSessionModel } from '@/modules/ai/openai-device-session.model';

// Mock dependencies
jest.mock('@/modules/ai/openai-connection.model', () => ({
  OpenAIConnectionModel: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
    updateOne: jest.fn(),
  },
}));
jest.mock('@/modules/ai/openai-device-session.model', () => ({
  OpenAIDeviceSessionModel: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
    create: jest.fn(),
  },
}));
jest.mock('@/shared/lib/encryption', () => ({
  encrypt: jest.fn((val: string) => ({
    encrypted: `enc_${val}`,
    iv: 'test_iv',
    authTag: 'test_tag',
  })),
  decrypt: jest.fn(
    (encrypted: string, _iv: string, _authTag: string) =>
      encrypted.replace('enc_', ''),
  ),
}));
jest.mock('@/modules/ai/openai-oauth');

const mockedConnectionModel = jest.mocked(OpenAIConnectionModel);
const mockedSessionModel = jest.mocked(OpenAIDeviceSessionModel);

describe('OpenAIConnectionService', () => {
  describe('getStatus', () => {
    it('returns connected=false when no connection exists', async () => {
      mockedConnectionModel.findOne.mockResolvedValue(null);

      const status = await OpenAIConnectionService.getStatus('user123');
      expect(status.connected).toBe(false);
    });

    it('returns connected=true with details when connection exists', async () => {
      mockedConnectionModel.findOne.mockResolvedValue({
        authMethod: 'oauth-device',
        email: 'user@example.com',
        planType: 'plus',
        tokenExpiresAt: new Date('2026-12-01'),
        isActive: true,
      });

      const status = await OpenAIConnectionService.getStatus('user123');
      expect(status.connected).toBe(true);
      expect(status.email).toBe('user@example.com');
      expect(status.planType).toBe('plus');
    });
  });

  describe('disconnect', () => {
    it('deletes connection and session for user', async () => {
      mockedConnectionModel.deleteOne.mockResolvedValue({ deletedCount: 1 } as never);
      mockedSessionModel.deleteOne.mockResolvedValue({ deletedCount: 0 } as never);

      await OpenAIConnectionService.disconnect('user123');
      expect(mockedConnectionModel.deleteOne).toHaveBeenCalledWith({ userId: 'user123' });
      expect(mockedSessionModel.deleteOne).toHaveBeenCalledWith({ userId: 'user123' });
    });
  });
});
