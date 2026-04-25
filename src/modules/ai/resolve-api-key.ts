import { OpenAIConnectionService } from './openai-connection.service';

export interface ResolvedKey {
  token: string;
  accountId?: string;
  source: 'oauth' | 'manual';
}

/**
 * Resolve an API key/token for a given user.
 * Priority: OAuth access token -> manual API key -> null (graceful skip).
 */
export async function resolveApiKey(userId: string): Promise<ResolvedKey | null> {
  const result = await OpenAIConnectionService.getValidAccessToken(userId);

  if (!result) return null;

  return {
    token: result.accessToken,
    accountId: result.accountId,
    source: result.accountId ? 'oauth' : 'manual',
  };
}
