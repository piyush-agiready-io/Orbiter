import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { parse, serialize } from 'cookie';
import { verifyRefreshToken } from '@/shared/lib/tokens';
import { GitHubOAuthService } from '@/modules/github/github-oauth.service';

export async function GET(req: NextRequest) {
  // The user must be logged in. Since this is a browser redirect (not an API call),
  // we verify via the refresh token cookie to get the userId, then embed it in state.
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) {
    return NextResponse.redirect(new URL('/login?error=not_authenticated', req.url));
  }

  const cookies = parse(cookieHeader);
  const refreshToken = cookies.refreshToken;
  if (!refreshToken) {
    return NextResponse.redirect(new URL('/login?error=not_authenticated', req.url));
  }

  let payload;
  try {
    payload = await verifyRefreshToken(refreshToken);
  } catch {
    return NextResponse.redirect(new URL('/login?error=not_authenticated', req.url));
  }

  // Encode userId into the state so the callback can identify the user
  const nonce = nanoid(32);
  const state = `${payload.userId}:${nonce}`;

  const cookie = serialize('github_oauth_state', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth/github',
    maxAge: 600, // 10 minutes
  });

  const authUrl = GitHubOAuthService.getAuthUrl(state);
  const response = NextResponse.redirect(authUrl);
  response.headers.set('Set-Cookie', cookie);
  return response;
}
