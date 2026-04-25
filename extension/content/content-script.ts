// Inlined to avoid ES module imports (content scripts can't use modules)
const MAX_CONSOLE_LOGS = 50;
const MAX_LOG_LENGTH = 500;

interface ConsoleLogEntry {
  level: 'error' | 'warn' | 'log';
  message: string;
  timestamp: number;
}

interface CapturedData {
  url: string;
  consoleLogs: ConsoleLogEntry[];
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

function interceptConsole(): void {
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: unknown[]) => {
    addLog('error', args);
    originalError.apply(console, args);
  };

  console.warn = (...args: unknown[]) => {
    addLog('warn', args);
    originalWarn.apply(console, args);
  };

  window.addEventListener('error', (event) => {
    addLog('error', [
      `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
    ]);
  });

  window.addEventListener('unhandledrejection', (event) => {
    addLog('error', [`Unhandled rejection: ${event.reason}`]);
  });
}

function addLog(level: ConsoleLogEntry['level'], args: unknown[]): void {
  const message = args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ')
    .slice(0, MAX_LOG_LENGTH);

  consoleLogs.push({
    level,
    message,
    timestamp: Date.now(),
  });

  if (consoleLogs.length > MAX_CONSOLE_LOGS) {
    consoleLogs.shift();
  }
}

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

interceptConsole();
