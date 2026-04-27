import { env } from '@/config/env';

const DEEPGRAM_LISTEN_URL =
  'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&language=en';

export class DeepgramService {
  /**
   * Transcribe an audio blob using Deepgram's REST listen endpoint.
   * Server-side only — keeps the master API key off the client.
   */
  static async transcribe(audio: ArrayBuffer, contentType: string): Promise<string> {
    if (!env.DEEPGRAM_API_KEY) {
      throw new Error('Deepgram API key not configured');
    }

    const response = await fetch(DEEPGRAM_LISTEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
        'Content-Type': contentType || 'audio/webm',
      },
      body: audio,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Deepgram listen failed: ${response.status} ${errorText.slice(0, 300)}`,
      );
    }

    const data = (await response.json()) as {
      results?: {
        channels?: Array<{
          alternatives?: Array<{ transcript?: string }>;
        }>;
      };
    };

    return data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
  }
}
