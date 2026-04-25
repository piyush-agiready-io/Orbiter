import { OpenAIConnectionModel } from './openai-connection.model';
import { OpenAIDeviceSessionModel } from './openai-device-session.model';
import {
  requestDeviceCode,
  pollDeviceAuthorization,
  exchangeCodeForTokens,
  refreshAccessToken,
  parseIdToken,
} from './openai-oauth';
import { encrypt, decrypt } from '@/shared/lib/encryption';
import { NotFoundError } from '@/shared/middleware/api-handler';
import type { DeviceCodeResponse, OpenAIConnectionStatus } from './openai-connection.types';

/**
 * Pack the three encryption components into a single string for storage.
 * Format: iv:authTag:encrypted
 */
function encryptToString(plaintext: string): string {
  const { encrypted, iv, authTag } = encrypt(plaintext);
  return `${iv}:${authTag}:${encrypted}`;
}

/**
 * Unpack a stored encrypted string and decrypt it.
 * Expects format: iv:authTag:encrypted
 */
function decryptFromString(packed: string): string {
  const [iv, authTag, encrypted] = packed.split(':');
  return decrypt(encrypted, iv, authTag);
}

export const OpenAIConnectionService = {
  /**
   * Get current connection status for a user.
   */
  async getStatus(userId: string): Promise<OpenAIConnectionStatus> {
    const conn = await OpenAIConnectionModel.findOne({ userId, isActive: true });
    if (!conn) return { connected: false };

    return {
      connected: true,
      authMethod: conn.authMethod,
      email: conn.email,
      planType: conn.planType,
      tokenExpiresAt: conn.tokenExpiresAt,
    };
  },

  /**
   * Initiate device code flow — generates PKCE verifier, requests device code,
   * stores session, returns user code for display.
   */
  async initiateDeviceCode(userId: string): Promise<DeviceCodeResponse> {
    // Clean up any existing session
    await OpenAIDeviceSessionModel.deleteOne({ userId });

    const deviceCode = await requestDeviceCode();

    await OpenAIDeviceSessionModel.create({
      userId,
      deviceAuthId: deviceCode.deviceAuthId,
      userCode: deviceCode.userCode,
      verificationUrl: deviceCode.verificationUrl,
      expiresAt: new Date(Date.now() + deviceCode.expiresIn * 1000),
      pollInterval: deviceCode.interval,
      status: 'pending',
    });

    return {
      userCode: deviceCode.userCode,
      verificationUrl: deviceCode.verificationUrl,
      expiresIn: deviceCode.expiresIn,
      interval: deviceCode.interval,
    };
  },

  /**
   * Store a manual API key connection.
   */
  async storeManualKey(userId: string, apiKey: string): Promise<void> {
    const encryptedKey = encryptToString(apiKey);

    await OpenAIConnectionModel.findOneAndUpdate(
      { userId },
      {
        userId,
        authMethod: 'manual',
        apiKey: encryptedKey,
        isActive: true,
        accessToken: undefined,
        refreshToken: undefined,
        idToken: undefined,
        tokenExpiresAt: undefined,
        email: undefined,
        accountId: undefined,
        planType: undefined,
      },
      { upsert: true, returnDocument: 'after' },
    );
  },

  /**
   * Poll for device authorization.
   * Returns { authorized: true } on success, { authorized: false } while pending.
   * Throws on expiry or denial.
   */
  async pollAuthorization(userId: string): Promise<{
    authorized: boolean;
    email?: string;
    planType?: string;
  }> {
    const session = await OpenAIDeviceSessionModel.findOne({
      userId,
      status: 'pending',
    });

    if (!session) {
      throw new NotFoundError('No pending device session');
    }

    if (session.expiresAt < new Date()) {
      await OpenAIDeviceSessionModel.deleteOne({ userId });
      throw new Error('Device code expired. Please start the connection process again.');
    }

    const result = await pollDeviceAuthorization(session.deviceAuthId, session.userCode);

    if (!result) {
      return { authorized: false };
    }

    // Exchange code for tokens — code_verifier comes from the poll response
    const tokens = await exchangeCodeForTokens(
      result.authorizationCode,
      result.codeVerifier ?? '',
    );

    // Parse id_token for user info
    const claims = tokens.idToken ? parseIdToken(tokens.idToken) : {};

    // Store encrypted tokens
    await OpenAIConnectionModel.findOneAndUpdate(
      { userId },
      {
        userId,
        authMethod: 'oauth-device',
        accessToken: encryptToString(tokens.accessToken),
        refreshToken: encryptToString(tokens.refreshToken),
        idToken: tokens.idToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        email: claims.email,
        accountId: claims.accountId,
        planType: claims.planType,
        isActive: true,
        apiKey: undefined,
      },
      { upsert: true, returnDocument: 'after' },
    );

    // Clean up session
    await OpenAIDeviceSessionModel.deleteOne({ userId });

    return {
      authorized: true,
      email: claims.email,
      planType: claims.planType,
    };
  },

  /**
   * Get a valid access token for a user, refreshing if expired.
   * Returns null if no connection or refresh fails.
   */
  async getValidAccessToken(userId: string): Promise<{
    accessToken: string;
    accountId?: string;
  } | null> {
    const conn = await OpenAIConnectionModel.findOne({ userId, isActive: true });
    if (!conn) return null;

    // Manual API key mode
    if (conn.authMethod === 'manual' && conn.apiKey) {
      return { accessToken: decryptFromString(conn.apiKey) };
    }

    // OAuth mode
    if (!conn.accessToken) return null;

    // Check if token is still valid (with 60s buffer)
    if (conn.tokenExpiresAt && conn.tokenExpiresAt > new Date(Date.now() + 60_000)) {
      return {
        accessToken: decryptFromString(conn.accessToken),
        accountId: conn.accountId,
      };
    }

    // Token expired — try refresh
    if (!conn.refreshToken) return null;

    try {
      const refreshed = await refreshAccessToken(decryptFromString(conn.refreshToken));

      const claims = refreshed.idToken ? parseIdToken(refreshed.idToken) : {};

      await OpenAIConnectionModel.updateOne(
        { userId },
        {
          accessToken: encryptToString(refreshed.accessToken),
          refreshToken: encryptToString(refreshed.refreshToken),
          idToken: refreshed.idToken ?? conn.idToken,
          tokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
          ...(claims.email && { email: claims.email }),
          ...(claims.accountId && { accountId: claims.accountId }),
          ...(claims.planType && { planType: claims.planType }),
        },
      );

      return {
        accessToken: refreshed.accessToken,
        accountId: claims.accountId ?? conn.accountId,
      };
    } catch {
      // Refresh failed — mark inactive, user needs to reconnect
      await OpenAIConnectionModel.updateOne({ userId }, { isActive: false });
      return null;
    }
  },

  /**
   * Disconnect — delete connection and any active session.
   */
  async disconnect(userId: string): Promise<void> {
    await OpenAIConnectionModel.deleteOne({ userId });
    await OpenAIDeviceSessionModel.deleteOne({ userId });
  },
};
