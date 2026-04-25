import { env } from '@/config/env';
import type { DeepgramTokenResponse } from './deepgram.types';

const DEEPGRAM_API_BASE = 'https://api.deepgram.com/v1';
const TOKEN_TTL_SECONDS = 30;

export class DeepgramService {
  static async generateToken(): Promise<DeepgramTokenResponse> {
    if (!env.DEEPGRAM_API_KEY) {
      throw new Error('Deepgram API key not configured');
    }

    const response = await fetch(`${DEEPGRAM_API_BASE}/auth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        time_to_live_in_seconds: TOKEN_TTL_SECONDS,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deepgram token request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return {
      token: data.key || data.token,
      expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000,
    };
  }
}
