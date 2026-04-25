import { STORAGE_KEYS } from './constants';
import type { ExtUser, AuthTokens } from './types';

export async function getStoredTokens(): Promise<AuthTokens | null> {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.TOKEN_EXPIRY,
  ]);

  const accessToken = result[STORAGE_KEYS.ACCESS_TOKEN] as string | undefined;
  const tokenExpiry = result[STORAGE_KEYS.TOKEN_EXPIRY] as number | undefined;

  if (!accessToken) return null;

  return { accessToken, tokenExpiry: tokenExpiry || 0 };
}

export async function storeTokens(
  accessToken: string,
  expiresInMs: number,
): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.ACCESS_TOKEN]: accessToken,
    [STORAGE_KEYS.TOKEN_EXPIRY]: Date.now() + expiresInMs,
  });
}

export async function getStoredUser(): Promise<ExtUser | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.USER);
  return (result[STORAGE_KEYS.USER] as ExtUser | undefined) || null;
}

export async function storeUser(user: ExtUser): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.USER]: user,
  });
}

export async function clearAuth(): Promise<void> {
  await chrome.storage.local.remove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER,
    STORAGE_KEYS.TOKEN_EXPIRY,
  ]);
}

export async function isTokenExpired(): Promise<boolean> {
  const tokens = await getStoredTokens();
  if (!tokens) return true;
  return Date.now() >= tokens.tokenExpiry - 60_000;
}
