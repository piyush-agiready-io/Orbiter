import { OPENAI_CONSTANTS } from '@/shared/utils/constants';

interface CodexRequest {
  accessToken: string;
  accountId?: string;
  instructions: string;
  input: string;
  model?: string;
}

/**
 * Wrapper for the ChatGPT Codex Responses API.
 * Bills against the user's ChatGPT subscription -- no separate API keys needed.
 */
export const CodexClient = {
  /**
   * Send a prompt to Codex and return the text response.
   * Uses non-streaming mode for simplicity in agent use cases.
   */
  async complete(req: CodexRequest): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${req.accessToken}`,
    };

    if (req.accountId) {
      headers['ChatGPT-Account-ID'] = req.accountId;
    }

    const res = await fetch(OPENAI_CONSTANTS.CODEX_API_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: req.model ?? 'gpt-4o',
        instructions: req.instructions,
        input: req.input,
        store: false,
        stream: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Codex API request failed (${res.status}): ${body}`);
    }

    const data = await res.json();
    return extractTextFromResponse(data);
  },
};

/**
 * Extract the text content from a Codex Responses API response.
 */
function extractTextFromResponse(data: unknown): string {
  const response = data as {
    output?: Array<{
      type: string;
      content?: Array<{ type: string; text?: string }>;
    }>;
  };

  if (!response.output) return '';

  for (const item of response.output) {
    if (item.type === 'message' && item.content) {
      for (const block of item.content) {
        if (block.type === 'output_text' && block.text) {
          return block.text;
        }
      }
    }
  }

  return '';
}
