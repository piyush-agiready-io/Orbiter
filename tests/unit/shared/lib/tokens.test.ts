import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '@/shared/lib/tokens';

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  },
}));

describe('Token utilities', () => {
  const payload = { userId: '507f1f77bcf86cd799439011', role: 'internal' as const };

  it('signs and verifies an access token', async () => {
    const token = await signAccessToken(payload);
    expect(typeof token).toBe('string');
    const decoded = await verifyAccessToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.role).toBe(payload.role);
  });

  it('signs and verifies a refresh token', async () => {
    const token = await signRefreshToken(payload);
    const decoded = await verifyRefreshToken(token);
    expect(decoded.userId).toBe(payload.userId);
  });

  it('rejects a token signed with wrong secret', async () => {
    const { SignJWT } = await import('jose');
    const wrongSecret = new TextEncoder().encode('c'.repeat(32));
    const token = await new SignJWT({ userId: 'test', role: 'internal' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('15m')
      .sign(wrongSecret);

    await expect(verifyAccessToken(token)).rejects.toThrow();
  });
});
