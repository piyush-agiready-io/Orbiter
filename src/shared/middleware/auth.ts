import { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/shared/lib/tokens';
import type { Role } from '@/shared/utils/constants';

export interface AuthenticatedUser {
  userId: string;
  role: Role;
}

export async function authenticate(req: NextRequest): Promise<AuthenticatedUser> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header');
  }
  const token = authHeader.slice(7);
  try {
    return await verifyAccessToken(token);
  } catch {
    throw new AuthError('Invalid or expired access token');
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
