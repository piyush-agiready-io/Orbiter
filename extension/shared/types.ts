export interface ExtUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'internal' | 'client';
}

export interface ExtProject {
  id: string;
  name: string;
  slug: string;
}

export interface CapturedData {
  url: string;
  consoleLogs: ConsoleLogEntry[];
  screenshot: Blob | null;
  device: string;
  browser: string;
  os: string;
  viewport: { width: number; height: number };
}

export interface ConsoleLogEntry {
  level: 'error' | 'warn' | 'log';
  message: string;
  timestamp: number;
}

export interface BugSubmission {
  title: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  projectId: string;
  metadata: {
    url: string;
    consoleLogs: string;
    screenshot?: string;
    device: string;
    browser: string;
    os: string;
    viewport: { width: number; height: number };
  };
}

export interface AuthTokens {
  accessToken: string;
  tokenExpiry: number;
}

export type MessageType =
  | 'CAPTURE_PAGE_DATA'
  | 'CAPTURE_SCREENSHOT'
  | 'GET_CONSOLE_LOGS'
  | 'API_REQUEST'
  | 'REFRESH_TOKEN'
  | 'UPLOAD_SCREENSHOT';

export interface ExtMessage {
  type: MessageType;
  payload?: unknown;
}

export interface ExtMessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
