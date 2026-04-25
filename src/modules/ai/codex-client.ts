import { OPENAI_CONSTANTS } from '@/shared/utils/constants';

interface CodexRequest {
  accessToken: string;
  accountId?: string;
  instructions: string;
  input: string;
  model?: string;
}

function sanitizeToAscii(text: string): string {
  return text.replace(/[^\x20-\x7E\n\r\t]/g, '').replace(/\{\{.*?\}\}/g, '');
}

async function parseSSEStream(response: Response): Promise<string> {
  const text = await response.text();
  const lines = text.split('\n');
  let result = '';

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();
    if (data === '[DONE]') break;

    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'response.output_text.delta' && parsed.delta) {
        result += parsed.delta;
      }
    } catch {
      // skip malformed lines
    }
  }

  return result;
}

export const CodexClient = {
  async complete(req: CodexRequest): Promise<string> {
    if (!req.accountId) {
      throw new Error('ChatGPT Account ID is required for Codex API calls');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${req.accessToken}`,
      'chatgpt-account-id': req.accountId,
    };

    const sanitizedInstructions = sanitizeToAscii(req.instructions);
    const sanitizedInput = sanitizeToAscii(req.input);

    const res = await fetch(OPENAI_CONSTANTS.CODEX_API_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: req.model ?? 'gpt-5.4',
        instructions: sanitizedInstructions,
        input: [{ role: 'user', content: sanitizedInput }],
        store: false,
        stream: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Codex API error (${res.status}):`, body.slice(0, 500));
      throw new Error(`Codex API failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const result = await parseSSEStream(res);
    if (!result) {
      throw new Error('Codex API returned empty response');
    }

    return result;
  },
};
