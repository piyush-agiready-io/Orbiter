export const API_BASE_URL = 'https://orbiteragiready.vercel.app/api/v1';

export const PLATFORM_URL = 'https://orbiteragiready.vercel.app';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'orbiter_access_token',
  REFRESH_TOKEN: 'orbiter_refresh_token',
  USER: 'orbiter_user',
  TOKEN_EXPIRY: 'orbiter_token_expiry',
} as const;

export const CAPTURE_LIMITS = {
  MAX_CONSOLE_LOGS: 50,
  MAX_LOG_LENGTH: 500,
  SCREENSHOT_MAX_WIDTH: 1920,
  SCREENSHOT_QUALITY: 0.85,
} as const;
