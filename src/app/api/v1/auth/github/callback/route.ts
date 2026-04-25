import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';
import { connectDB } from '@/shared/database/connection';
import { GitHubOAuthService } from '@/modules/github/github-oauth.service';
import { encrypt } from '@/shared/lib/encryption';
import { User } from '@/modules/users/user.model';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(new URL('/settings?error=missing_params', req.url));
    }

    // State format: "userId:nonce"
    const colonIdx = state.indexOf(':');
    if (colonIdx === -1) {
      return NextResponse.redirect(new URL('/settings?error=invalid_state', req.url));
    }

    const userId = state.substring(0, colonIdx);
    const nonce = state.substring(colonIdx + 1);

    // Verify nonce against cookie
    const cookies = parse(req.headers.get('cookie') ?? '');
    if (!nonce || nonce !== cookies.github_oauth_state) {
      return NextResponse.redirect(new URL('/settings?error=invalid_state', req.url));
    }

    // Exchange code for GitHub token
    const github = await GitHubOAuthService.exchangeCode(code);

    // Encrypt and store the GitHub token on the user
    const { encrypted, iv, authTag } = encrypt(github.accessToken);

    await User.findByIdAndUpdate(userId, {
      githubOAuth: {
        accessToken: `${iv}:${authTag}:${encrypted}`,
        githubId: github.githubId,
        username: github.username,
      },
    });

    return NextResponse.redirect(new URL('/settings?github=connected', req.url));
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    return NextResponse.redirect(new URL('/settings?error=github_failed', req.url));
  }
}
