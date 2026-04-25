export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const TOKEN_EXPIRY = {
  ACCESS: '15m',
  REFRESH: '7d',
  RESET: 60 * 60 * 1000,
  INVITE: 7 * 24 * 60 * 60 * 1000,
} as const;

export const ROLES = ['admin', 'internal', 'client'] as const;
export type Role = (typeof ROLES)[number];

export const OPENAI_CONSTANTS = {
  CLIENT_ID: 'app_EMoamEEZ73f0CkXaXp7hrann',
  DEVICE_CODE_ENDPOINT: 'https://auth.openai.com/api/accounts/deviceauth/usercode',
  POLL_ENDPOINT: 'https://auth.openai.com/api/accounts/deviceauth/token',
  TOKEN_EXCHANGE_ENDPOINT: 'https://auth.openai.com/oauth/token',
  CODEX_API_ENDPOINT: 'https://chatgpt.com/backend-api/codex/responses',
  VERIFICATION_URL: 'https://auth.openai.com/codex/device',
  POLL_INTERVAL_MS: 5000,
  DEVICE_CODE_EXPIRY_S: 600,
} as const;

export const GITHUB_SYNC_CONSTANTS = {
  CRON_INTERVAL_HOURS: 6,
  MAX_COMMITS_PER_REPO: 50,
  TASK_ID_PATTERNS: [
    /(?:feature|fix|bugfix|hotfix)\/TASK-(\d+)/i,
    /(?:fixes|closes|resolves)\s+#(\d+)/i,
    /TASK-(\d+)/i,
  ],
} as const;

export const AI_AGENT_CONSTANTS = {
  PRIORITY_MAP: {
    P0: ['auth', 'security', 'authentication', 'authorization', 'crash', 'data loss', 'payment', 'billing'],
    P1: ['payment', 'api', 'integration', 'performance', 'broken', 'blocked'],
    P2: ['feature', 'improvement', 'enhancement', 'refactor'],
    P3: ['ui polish', 'typo', 'cosmetic', 'nice to have', 'low priority'],
  },
  DEFAULT_PRIORITY: 'P2' as const,
  MAX_DURATION_CRON: 300,
} as const;
