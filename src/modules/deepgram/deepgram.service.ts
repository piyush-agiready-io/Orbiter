import { env } from '@/config/env';
import type { DeepgramTokenResponse } from './deepgram.types';

const DEEPGRAM_API_BASE = 'https://api.deepgram.com/v1';
const TOKEN_TTL_SECONDS = 30;

export class DeepgramService {
  static async generateToken(): Promise<DeepgramTokenResponse> {
    if (!env.DEEPGRAM_API_KEY) {
      throw new Error('Deepgram API key not configured');
    }

    // /v1/auth/grant returns an ephemeral access token suitable for the
    // browser to authenticate with Deepgram's streaming WebSocket. The
    // older /v1/auth/token path used by earlier builds doesn't exist on
    // current Deepgram and was always 4xx-ing — that's why the voice
    // probe in the extension popup kept hiding the button.
    const response = await fetch(`${DEEPGRAM_API_BASE}/auth/grant`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ttl_seconds: TOKEN_TTL_SECONDS,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Deepgram token request failed: ${response.status} ${errorText}`,
      );
    }

    const data = await response.json();
    const token = data.access_token ?? data.key ?? data.token;
    if (!token) {
      throw new Error('Deepgram returned no access token');
    }

    return {
      token,
      expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000,
    };
  }
}
