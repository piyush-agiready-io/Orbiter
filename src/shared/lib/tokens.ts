import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/config/env';
import type { Role } from '@/shared/utils/constants';

interface TokenPayload {
  userId: string;
  role: Role;
}

function getAccessSecret() {
  return new TextEncoder().encode(env.JWT_ACCESS_SECRET);
}

function getRefreshSecret() {
  return new TextEncoder().encode(env.JWT_REFRESH_SECRET);
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(getAccessSecret());
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getRefreshSecret());
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getAccessSecret());
  return { userId: payload.userId as string, role: payload.role as Role };
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getRefreshSecret());
  return { userId: payload.userId as string, role: payload.role as Role };
}
