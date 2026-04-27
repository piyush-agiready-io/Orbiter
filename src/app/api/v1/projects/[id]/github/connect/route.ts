import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { serialize } from 'cookie';
import { connectDB } from '@/shared/database/connection';
import { authenticate } from '@/shared/middleware/auth';
import { GitHubOAuthService, GitHubOAuthConfigError } from '@/modules/github/github-oauth.service';
import { apiSuccess, apiError } from '@/shared/utils/api-response';

export async function POST(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
) {
  try {
    await connectDB();
    await authenticate(req);
    const params = await context.params;
    const projectId = params.id;

    const nonce = nanoid(32);
    const state = `project:${projectId}:${nonce}`;

    const cookie = serialize('github_oauth_state', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/github',
      maxAge: 600,
    });

    const authUrl = GitHubOAuthService.getAuthUrl(state);

    const response = NextResponse.json(apiSuccess({ authUrl }), { status: 200 });
    response.headers.set('Set-Cookie', cookie);
    return response;
  } catch (err) {
    if (err instanceof GitHubOAuthConfigError) {
      return NextResponse.json(
        apiError('GITHUB_NOT_CONFIGURED', err.message),
        { status: 503 },
      );
    }
    return NextResponse.json(apiError('UNAUTHORIZED', 'Not authenticated'), { status: 401 });
  }
}
