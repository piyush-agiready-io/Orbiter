import { OPENAI_CONSTANTS } from '@/shared/utils/constants';

/**
 * Parse an OpenAI id_token JWT to extract user claims.
 * Only reads the payload — does not verify signature (server already validated via token exchange).
 */
export function parseIdToken(idToken: string): {
  email?: string;
  accountId?: string;
  planType?: string;
} {
  const parts = idToken.split('.');
  if (parts.length !== 3) return {};
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  return {
    email: payload.email,
    accountId: payload.chatgpt_account_id,
    planType: payload.chatgpt_plan_type,
  };
}

/**
 * Request a device code from OpenAI.
 * Returns the user code + verification URL for the frontend to display.
 */
export async function requestDeviceCode(): Promise<{
  deviceAuthId: string;
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
  interval: number;
}> {
  const res = await fetch(OPENAI_CONSTANTS.DEVICE_CODE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: OPENAI_CONSTANTS.CLIENT_ID,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Device code request failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return {
    deviceAuthId: data.device_code ?? data.device_auth_id,
    userCode: data.user_code,
    verificationUrl:
      data.verification_uri ?? data.verification_url ?? OPENAI_CONSTANTS.VERIFICATION_URL,
    expiresIn: data.expires_in ?? OPENAI_CONSTANTS.DEVICE_CODE_EXPIRY_S,
    interval: data.interval ?? 5,
  };
}

/**
 * Poll OpenAI for device authorization status.
 * Returns null if still pending, or the authorization code + code verifier if authorized.
 * Throws if expired or denied.
 */
export async function pollDeviceAuthorization(
  deviceAuthId: string,
  userCode: string,
): Promise<{
  authorizationCode: string;
  codeVerifier?: string;
} | null> {
  const res = await fetch(OPENAI_CONSTANTS.POLL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_auth_id: deviceAuthId,
      user_code: userCode,
    }),
  });

  // 403/404 = still pending
  if (res.status === 403 || res.status === 404) {
    return null;
  }

  // 410 = expired
  if (res.status === 410) {
    throw new Error('Device code expired');
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Poll failed (${res.status}): ${body}`);
  }

  const data = await res.json();

  // Check for pending status in response body too
  if (data.error === 'authorization_pending' || data.error === 'slow_down') {
    return null;
  }

  if (data.error) {
    throw new Error(`Device authorization failed: ${data.error}`);
  }

  return {
    authorizationCode: data.authorization_code ?? data.code,
    codeVerifier: data.code_verifier,
  };
}

/**
 * Exchange authorization code + PKCE verifier for access/refresh/id tokens.
 */
export async function exchangeCodeForTokens(
  authorizationCode: string,
  codeVerifier: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresIn: number;
}> {
  const res = await fetch(OPENAI_CONSTANTS.TOKEN_EXCHANGE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: OPENAI_CONSTANTS.CLIENT_ID,
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: 'https://auth.openai.com/deviceauth/callback',
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
    expiresIn: data.expires_in ?? 3600,
  };
}

/**
 * Refresh an expired access token using the stored refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresIn: number;
}> {
  const res = await fetch(OPENAI_CONSTANTS.TOKEN_EXCHANGE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: OPENAI_CONSTANTS.CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    idToken: data.id_token,
    expiresIn: data.expires_in ?? 3600,
  };
}
