import { resolveApiKey } from '@/modules/ai/resolve-api-key';
import { CodexClient } from '@/modules/ai/codex-client';
import { AI_AGENT_CONSTANTS } from '@/shared/utils/constants';

type Priority = 'P0' | 'P1' | 'P2' | 'P3';
type PrioritySource = 'ai' | 'keyword' | 'default';

const VALID_PRIORITIES = new Set<string>(['P0', 'P1', 'P2', 'P3']);

const SYSTEM_INSTRUCTIONS = `You are a project management priority classifier. Given a task title and description, classify its priority as exactly one of: P0, P1, P2, or P3.

Priority guidelines:
- P0 (Critical): Authentication, security vulnerabilities, crashes, data loss, payment/billing failures
- P1 (High): Broken integrations, API failures, performance issues, blocked workflows
- P2 (Medium): New features, improvements, enhancements, refactoring
- P3 (Low): UI polish, typos, cosmetic fixes, nice-to-have improvements

Respond with ONLY the priority level (e.g., "P0"). No explanation.`;

/**
 * Try to classify priority using keyword matching against PRIORITY_MAP.
 * Returns the highest-priority match (P0 > P1 > P2 > P3), or null if no match.
 */
function classifyByKeywords(
  title: string,
  description?: string,
): { priority: Priority; source: 'keyword' } | null {
  const text = `${title} ${description ?? ''}`.toLowerCase();
  const priorityOrder: Priority[] = ['P0', 'P1', 'P2', 'P3'];

  for (const level of priorityOrder) {
    const keywords = AI_AGENT_CONSTANTS.PRIORITY_MAP[level];
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return { priority: level, source: 'keyword' };
      }
    }
  }

  return null;
}

export const PriorityDetectionAgent = {
  /**
   * Classify priority: ChatGPT first, keyword matching as fallback.
   * Falls back to P2 if both methods fail or are unavailable.
   */
  async classify(
    userId: string,
    title: string,
    description?: string,
  ): Promise<{ priority: Priority; source: PrioritySource }> {
    // Step 1: Try ChatGPT classification first (primary)
    try {
      const key = await resolveApiKey(userId);
      if (key) {
        const input = description
          ? `Task: ${title}\nDescription: ${description}`
          : `Task: ${title}`;

        const response = await CodexClient.complete({
          accessToken: key.token,
          accountId: key.accountId,
          instructions: SYSTEM_INSTRUCTIONS,
          input,
        });

        const cleaned = response.trim().toUpperCase();
        if (VALID_PRIORITIES.has(cleaned)) {
          return { priority: cleaned as Priority, source: 'ai' };
        }
        console.warn(`Priority agent returned invalid value: "${response}"`);
      }
    } catch (error) {
      console.error('ChatGPT priority classification failed, falling back to keywords:', error);
    }

    // Step 2: Fallback — keyword-based classification
    const keywordResult = classifyByKeywords(title, description);
    if (keywordResult) {
      return keywordResult;
    }

    // Step 3: Default when both fail
    return { priority: AI_AGENT_CONSTANTS.DEFAULT_PRIORITY, source: 'default' };
  },
};
