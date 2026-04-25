import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';
import { connectDB } from '@/shared/database/connection';
import { GitHubOAuthService } from '@/modules/github/github-oauth.service';
import { encrypt } from '@/shared/lib/encryption';
import { Project } from '@/modules/projects/project.model';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(new URL('/settings?error=missing_params', req.url));
    }

    const cookies = parse(req.headers.get('cookie') ?? '');

    if (state.startsWith('project:')) {
      const parts = state.split(':');
      if (parts.length < 3) {
        return NextResponse.redirect(new URL('/settings?error=invalid_state', req.url));
      }
      const projectId = parts[1];
      const nonce = parts.slice(2).join(':');

      if (!nonce || nonce !== cookies.github_oauth_state) {
        return NextResponse.redirect(
          new URL(`/projects/${projectId}/github?error=invalid_state`, req.url),
        );
      }

      const github = await GitHubOAuthService.exchangeCode(code);
      const { encrypted, iv, authTag } = encrypt(github.accessToken);

      await Project.findByIdAndUpdate(projectId, {
        githubOAuth: {
          accessToken: `${iv}:${authTag}:${encrypted}`,
          username: github.username,
        },
      });

      return NextResponse.redirect(
        new URL(`/projects/${projectId}/github?connected=true`, req.url),
      );
    }

    return NextResponse.redirect(new URL('/settings?error=invalid_state', req.url));
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    return NextResponse.redirect(new URL('/settings?error=github_failed', req.url));
  }
}
