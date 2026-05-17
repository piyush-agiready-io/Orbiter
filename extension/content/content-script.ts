// Inlined to avoid ES module imports (content scripts can't use modules)
const MAX_CONSOLE_LOGS = 100;
const MAX_NETWORK_LOGS = 100;
const MAX_LOG_LENGTH = 500;
const MAIN_WORLD_MAGIC = 'orbiter-capture';

interface ConsoleLogEntry {
  level: 'error' | 'warn' | 'info' | 'log';
  message: string;
  timestamp: number;
}

interface NetworkLogEntry {
  method: string;
  url: string;
  status: number;
  durationMs: number;
  timestamp: number;
}

interface CapturedData {
  url: string;
  consoleLogs: ConsoleLogEntry[];
  networkLogs: NetworkLogEntry[];
  screenshot: null;
  device: string;
  browser: string;
  os: string;
  viewport: { width: number; height: number };
}

interface ExtMessage {
  type: string;
  payload?: unknown;
}

interface ExtMessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const consoleLogs: ConsoleLogEntry[] = [];
const networkLogs: NetworkLogEntry[] = [];

// The MAIN-world capture script (main-world-capture.js) sees the page's own
// console + fetch + XHR — things we cannot intercept from this ISOLATED world.
// It posts each captured event back to us via window.postMessage with the
// magic source key. We also keep the existing window.onerror /
// unhandledrejection listeners here because they DO fire on ISOLATED-side for
// page errors and act as a fallback if the MAIN-world script was blocked
// (e.g. by a strict CSP).

interface OrbiterMessageData {
  source?: string;
  kind?: 'console' | 'network';
  entry?: {
    level?: ConsoleLogEntry['level'];
    message?: string;
    method?: string;
    url?: string;
    status?: number;
    durationMs?: number;
    ts?: number;
  };
}

function clampConsole(entry: ConsoleLogEntry): void {
  consoleLogs.push(entry);
  if (consoleLogs.length > MAX_CONSOLE_LOGS) consoleLogs.shift();
}

function clampNetwork(entry: NetworkLogEntry): void {
  networkLogs.push(entry);
  if (networkLogs.length > MAX_NETWORK_LOGS) networkLogs.shift();
}

window.addEventListener('message', (event: MessageEvent<OrbiterMessageData>) => {
  // event.source must be this window — MAIN world posts to its own window.
  // Ignore cross-frame/cross-origin messages.
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== MAIN_WORLD_MAGIC || !data.entry) return;

  if (data.kind === 'console' && typeof data.entry.message === 'string') {
    clampConsole({
      level: (data.entry.level as ConsoleLogEntry['level']) || 'log',
      message: data.entry.message.slice(0, MAX_LOG_LENGTH),
      timestamp: typeof data.entry.ts === 'number' ? data.entry.ts : Date.now(),
    });
  } else if (data.kind === 'network' && typeof data.entry.url === 'string') {
    clampNetwork({
      method: data.entry.method || 'GET',
      url: data.entry.url,
      status: typeof data.entry.status === 'number' ? data.entry.status : 0,
      durationMs: typeof data.entry.durationMs === 'number' ? data.entry.durationMs : 0,
      timestamp: typeof data.entry.ts === 'number' ? data.entry.ts : Date.now(),
    });
  }
});

// Fallback: page-level errors and rejections also fire on the ISOLATED-side
// window object. If MAIN-world was blocked (CSP) we'd still catch these.
window.addEventListener('error', (event) => {
  clampConsole({
    level: 'error',
    message: `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`.slice(0, MAX_LOG_LENGTH),
    timestamp: Date.now(),
  });
});

window.addEventListener('unhandledrejection', (event) => {
  clampConsole({
    level: 'error',
    message: `Unhandled rejection: ${event.reason}`.slice(0, MAX_LOG_LENGTH),
    timestamp: Date.now(),
  });
});

function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox/')) return `Firefox ${ua.split('Firefox/')[1]?.split(' ')[0]}`;
  if (ua.includes('Edg/')) return `Edge ${ua.split('Edg/')[1]?.split(' ')[0]}`;
  if (ua.includes('Chrome/')) return `Chrome ${ua.split('Chrome/')[1]?.split(' ')[0]}`;
  if (ua.includes('Safari/')) return `Safari ${ua.split('Version/')[1]?.split(' ')[0]}`;
  return 'Unknown';
}

function getOSInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}

function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Mobile')) return 'Mobile';
  if (ua.includes('Tablet')) return 'Tablet';
  return 'Desktop';
}

function getPageData(): CapturedData {
  return {
    url: window.location.href,
    consoleLogs: [...consoleLogs],
    networkLogs: [...networkLogs],
    screenshot: null,
    device: getDeviceInfo(),
    browser: getBrowserInfo(),
    os: getOSInfo(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
}

chrome.runtime.onMessage.addListener(
  (
    message: ExtMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtMessageResponse) => void,
  ) => {
    switch (message.type) {
      case 'CAPTURE_PAGE_DATA': {
        const data = getPageData();
        sendResponse({ success: true, data });
        break;
      }
      case 'GET_CONSOLE_LOGS': {
        sendResponse({ success: true, data: [...consoleLogs] });
        break;
      }
      default:
        sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
    }

    return true;
  },
);
