import { env } from '@/config/env';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';

export const GitHubOAuthService = {
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/v1/auth/github/callback`,
      scope: 'read:user repo',
      state,
    });
    return `${GITHUB_AUTH_URL}?${params}`;
  },

  async exchangeCode(code: string): Promise<{
    accessToken: string;
    githubId: string;
    username: string;
  }> {
    const res = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);

    // Get user info
    const userRes = await fetch(GITHUB_USER_URL, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const user = await userRes.json();

    return {
      accessToken: data.access_token,
      githubId: String(user.id),
      username: user.login,
    };
  },
};
