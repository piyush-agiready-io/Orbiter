# Orbiter Chrome Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Manifest V3 Chrome extension for one-click bug capture — auto-collecting console logs, screenshots, URL, device info — with voice input via Deepgram, then submitting bugs to the Orbiter platform API.

**Architecture:** React-based popup (Vite + TypeScript), Manifest V3 service worker for auth/token management, content script for page data capture, Deepgram WebSocket for real-time voice transcription. Communicates with the existing Orbiter Next.js API for auth, project listing, screenshot upload (R2 presigned URLs), and bug creation.

**Tech Stack:** React 19, TypeScript 5, Vite, Tailwind CSS 4, chrome.storage API, chrome.debugger API, Deepgram WebSocket SDK, html2canvas (fallback)

**Spec:** `docs/superpowers/specs/2026-04-24-orbiter-design.md`
**Design System:** `DESIGN_SYSTEM.md`

**Dependencies:** Plans 1-5 must be complete (auth, projects, bugs modules all operational).

---

## File Structure

```
extension/
├── manifest.json                          ← Manifest V3 config
├── vite.config.ts                         ← Vite build config (multi-entry)
├── tsconfig.json                          ← TypeScript config
├── tailwind.config.ts                     ← Tailwind (reuses Orbiter tokens)
├── package.json                           ← Extension-specific dependencies
├── popup/
│   ├── index.html                         ← Popup HTML entry
│   ├── popup.tsx                          ← React entry point
│   ├── popup.css                          ← Tailwind + Orbiter theme tokens
│   ├── components/
│   │   ├── LoginForm.tsx                  ← Email/password login
│   │   ├── BugCapture.tsx                 ← Main capture form
│   │   ├── ProjectSelector.tsx            ← Project dropdown
│   │   └── VoiceInput.tsx                 ← Deepgram voice toggle
│   └── hooks/
│       ├── useExtAuth.ts                  ← Auth state from chrome.storage
│       └── useCapture.ts                  ← Page data capture orchestration
├── background/
│   └── service-worker.ts                  ← Auth tokens, API calls, R2 upload
├── content/
│   └── content-script.ts                  ← Console capture, page info, screenshot
├── shared/
│   ├── api.ts                             ← API client (fetch wrapper with auth)
│   ├── storage.ts                         ← chrome.storage.local helpers
│   ├── types.ts                           ← Shared TypeScript interfaces
│   └── constants.ts                       ← API base URL, storage keys
└── build/                                 ← Vite output (dist)

src/app/api/v1/deepgram/
└── token/route.ts                         ← NEW: Generate short-lived Deepgram token

src/modules/deepgram/
├── deepgram.service.ts                    ← Token generation logic
└── deepgram.types.ts                      ← TypeScript interfaces

src/config/env.ts                          ← ADD: DEEPGRAM_API_KEY env var
```

---

### Task 1: Extension Project Scaffold & Build System

**Files:**
- Create: `extension/package.json`, `extension/tsconfig.json`, `extension/vite.config.ts`, `extension/tailwind.config.ts`, `extension/manifest.json`

- [ ] **Step 1: Create extension directory and package.json**

```bash
mkdir -p extension
cd extension
npm init -y
```

Update `extension/package.json`:

```json
{
  "name": "orbiter-extension",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite build --watch --mode development",
    "build": "vite build",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd extension

# Core
npm install react react-dom

# Build
npm install -D vite @vitejs/plugin-react typescript
npm install -D tailwindcss @tailwindcss/vite
npm install -D @types/react @types/react-dom @types/chrome

# Screenshot fallback
npm install html2canvas
```

- [ ] **Step 3: Create tsconfig.json**

```typescript
// extension/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@ext/*": ["./*"]
    },
    "types": ["chrome"]
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "build"]
}
```

- [ ] **Step 4: Create Vite config with multi-entry build**

```typescript
// extension/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'build',
    emptyDirFirst: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup/index.html'),
        'service-worker': resolve(__dirname, 'background/service-worker.ts'),
        'content-script': resolve(__dirname, 'content/content-script.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  resolve: {
    alias: {
      '@ext': resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 5: Create Tailwind config reusing Orbiter tokens**

```typescript
// extension/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./popup/**/*.{ts,tsx,html}'],
};

export default config;
```

- [ ] **Step 6: Create manifest.json (Manifest V3)**

```json
{
  "manifest_version": 3,
  "name": "Orbiter Bug Capture",
  "version": "1.0.0",
  "description": "One-click bug capture for Orbiter project management",
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "tabs",
    "debugger"
  ],
  "host_permissions": [
    "https://*.r2.cloudflarestorage.com/*"
  ],
  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script.js"],
      "run_at": "document_start"
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

- [ ] **Step 7: Create placeholder icon files**

Create `extension/icons/` directory. Add placeholder PNG icons at 16, 32, 48, and 128px sizes. These will be replaced with proper Orbiter-branded icons later.

- [ ] **Step 8: Verify build succeeds**

```bash
cd extension
npm run build
```

Expected: Build completes without errors (will have empty entry points for now).

- [ ] **Step 9: Commit**

```bash
git add extension/
git commit -m "chore: scaffold Chrome extension with Manifest V3, Vite, and Tailwind"
```

---

### Task 2: Extension Shared Utilities (Storage, Constants, Types)

**Files:**
- Create: `extension/shared/constants.ts`, `extension/shared/types.ts`, `extension/shared/storage.ts`

- [ ] **Step 1: Create constants**

```typescript
// extension/shared/constants.ts
export const API_BASE_URL = 'http://localhost:3000/api/v1';

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
```

- [ ] **Step 2: Create shared types**

```typescript
// extension/shared/types.ts
export interface ExtUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'internal' | 'client';
}

export interface ExtProject {
  _id: string;
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
```

- [ ] **Step 3: Create chrome.storage helpers**

```typescript
// extension/shared/storage.ts
import { STORAGE_KEYS } from './constants';
import type { ExtUser, AuthTokens } from './types';

export async function getStoredTokens(): Promise<AuthTokens | null> {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.TOKEN_EXPIRY,
  ]);

  const accessToken = result[STORAGE_KEYS.ACCESS_TOKEN];
  const tokenExpiry = result[STORAGE_KEYS.TOKEN_EXPIRY];

  if (!accessToken) return null;

  return { accessToken, tokenExpiry: tokenExpiry || 0 };
}

export async function storeTokens(
  accessToken: string,
  expiresInMs: number,
): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.ACCESS_TOKEN]: accessToken,
    [STORAGE_KEYS.TOKEN_EXPIRY]: Date.now() + expiresInMs,
  });
}

export async function getStoredUser(): Promise<ExtUser | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.USER);
  return result[STORAGE_KEYS.USER] || null;
}

export async function storeUser(user: ExtUser): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.USER]: user,
  });
}

export async function clearAuth(): Promise<void> {
  await chrome.storage.local.remove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER,
    STORAGE_KEYS.TOKEN_EXPIRY,
  ]);
}

export async function isTokenExpired(): Promise<boolean> {
  const tokens = await getStoredTokens();
  if (!tokens) return true;
  // Consider expired 60 seconds early to avoid race conditions
  return Date.now() >= tokens.tokenExpiry - 60_000;
}
```

- [ ] **Step 4: Commit**

```bash
git add extension/shared/
git commit -m "feat: add extension shared utilities — storage, types, and constants"
```

---

### Task 3: Extension API Client

**Files:**
- Create: `extension/shared/api.ts`

- [ ] **Step 1: Create API client with auth header injection**

```typescript
// extension/shared/api.ts
import { API_BASE_URL } from './constants';
import { getStoredTokens, isTokenExpired } from './storage';
import type { ExtMessageResponse } from './types';

async function getAccessToken(): Promise<string | null> {
  const expired = await isTokenExpired();

  if (expired) {
    // Ask service worker to refresh the token
    const response = await chrome.runtime.sendMessage({
      type: 'REFRESH_TOKEN',
    });
    if (!response?.success) return null;
  }

  const tokens = await getStoredTokens();
  return tokens?.accessToken || null;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  requireAuth?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const { method = 'GET', body, headers = {}, requireAuth = true } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (requireAuth) {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    const json = await response.json();

    if (!response.ok || !json.success) {
      return {
        success: false,
        error: json.error?.message || `Request failed with status ${response.status}`,
      };
    }

    return { success: true, data: json.data as T };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

export async function uploadScreenshot(
  blob: Blob,
  filename: string,
): Promise<{ success: true; data: string } | { success: false; error: string }> {
  // Step 1: Get presigned URL from platform
  const presignResult = await apiRequest<{
    uploadUrl: string;
    fileKey: string;
    publicUrl: string;
  }>('/upload', {
    method: 'POST',
    body: { filename, contentType: blob.type },
  });

  if (!presignResult.success) {
    return { success: false, error: presignResult.error };
  }

  // Step 2: Upload directly to R2
  try {
    const uploadResponse = await fetch(presignResult.data.uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': blob.type },
    });

    if (!uploadResponse.ok) {
      return { success: false, error: 'Screenshot upload to R2 failed' };
    }

    return { success: true, data: presignResult.data.publicUrl };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Upload failed',
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add extension/shared/api.ts
git commit -m "feat: add extension API client with auth injection and R2 upload"
```

---

### Task 4: Content Script — Console Capture & Page Info

**Files:**
- Create: `extension/content/content-script.ts`

- [ ] **Step 1: Create content script with console interception**

```typescript
// extension/content/content-script.ts
import { CAPTURE_LIMITS } from '@ext/shared/constants';
import type { ConsoleLogEntry, CapturedData, ExtMessage, ExtMessageResponse } from '@ext/shared/types';

const consoleLogs: ConsoleLogEntry[] = [];

// Intercept console methods to capture errors and warnings
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

  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    addLog('error', [
      `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
    ]);
  });

  // Capture unhandled promise rejections
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
    .slice(0, CAPTURE_LIMITS.MAX_LOG_LENGTH);

  consoleLogs.push({
    level,
    message,
    timestamp: Date.now(),
  });

  // Keep only the most recent logs
  if (consoleLogs.length > CAPTURE_LIMITS.MAX_CONSOLE_LOGS) {
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

// Listen for messages from popup or service worker
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

    // Return true to indicate async response
    return true;
  },
);

// Start intercepting console on load
interceptConsole();
```

- [ ] **Step 2: Commit**

```bash
git add extension/content/
git commit -m "feat: add content script with console capture and page info collection"
```

---

### Task 5: Service Worker — Auth & Token Management

**Files:**
- Create: `extension/background/service-worker.ts`

- [ ] **Step 1: Create service worker with auth management**

```typescript
// extension/background/service-worker.ts
import { API_BASE_URL, STORAGE_KEYS } from '@ext/shared/constants';
import {
  storeTokens,
  storeUser,
  clearAuth,
  getStoredTokens,
  isTokenExpired,
} from '@ext/shared/storage';
import type { ExtMessage, ExtMessageResponse, ExtUser } from '@ext/shared/types';

// Token refresh: 15-minute access tokens, refresh 60s before expiry
const ACCESS_TOKEN_DURATION_MS = 15 * 60 * 1000;

async function handleLogin(
  email: string,
  password: string,
): Promise<ExtMessageResponse<ExtUser>> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    const json = await response.json();

    if (!response.ok || !json.success) {
      return {
        success: false,
        error: json.error?.message || 'Login failed',
      };
    }

    const { user, accessToken } = json.data;

    await storeTokens(accessToken, ACCESS_TOKEN_DURATION_MS);
    await storeUser(user);

    return { success: true, data: user };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Login failed',
    };
  }
}

async function handleRefreshToken(): Promise<ExtMessageResponse<string>> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    const json = await response.json();

    if (!response.ok || !json.success) {
      // Refresh failed — clear auth and require re-login
      await clearAuth();
      return { success: false, error: 'Session expired. Please log in again.' };
    }

    const { accessToken } = json.data;
    await storeTokens(accessToken, ACCESS_TOKEN_DURATION_MS);

    return { success: true, data: accessToken };
  } catch (err) {
    await clearAuth();
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Token refresh failed',
    };
  }
}

async function handleLogout(): Promise<ExtMessageResponse> {
  await clearAuth();
  return { success: true };
}

async function handleScreenshotCapture(
  tabId: number,
): Promise<ExtMessageResponse<string>> {
  try {
    // Use chrome.tabs.captureVisibleTab for screenshot
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
      format: 'png',
      quality: 100,
    });

    return { success: true, data: dataUrl };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Screenshot capture failed',
    };
  }
}

async function handleUploadScreenshot(
  dataUrl: string,
): Promise<ExtMessageResponse<string>> {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const filename = `bug-screenshot-${Date.now()}.png`;

    // Get access token
    const tokens = await getStoredTokens();
    if (!tokens?.accessToken) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get presigned URL
    const presignResponse = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      body: JSON.stringify({ filename, contentType: 'image/png' }),
    });

    const presignJson = await presignResponse.json();
    if (!presignResponse.ok || !presignJson.success) {
      return { success: false, error: 'Failed to get upload URL' };
    }

    const { uploadUrl, publicUrl } = presignJson.data;

    // Upload to R2
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': 'image/png' },
    });

    if (!uploadResponse.ok) {
      return { success: false, error: 'Screenshot upload failed' };
    }

    return { success: true, data: publicUrl };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Upload failed',
    };
  }
}

// Set up auto-refresh alarm
chrome.alarms.create('token-refresh', { periodInMinutes: 12 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'token-refresh') {
    const expired = await isTokenExpired();
    if (expired) {
      await handleRefreshToken();
    }
  }
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener(
  (
    message: ExtMessage & { payload?: Record<string, unknown> },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtMessageResponse) => void,
  ) => {
    const payload = message.payload as Record<string, unknown> | undefined;

    switch (message.type) {
      case 'API_REQUEST': {
        // Proxy API requests through service worker for auth management
        const { endpoint, method, body } = payload as {
          endpoint: string;
          method: string;
          body?: unknown;
        };
        (async () => {
          const tokens = await getStoredTokens();
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (tokens?.accessToken) {
            headers['Authorization'] = `Bearer ${tokens.accessToken}`;
          }
          try {
            const resp = await fetch(`${API_BASE_URL}${endpoint}`, {
              method,
              headers,
              body: body ? JSON.stringify(body) : undefined,
              credentials: 'include',
            });
            const json = await resp.json();
            sendResponse({ success: json.success, data: json.data, error: json.error?.message });
          } catch (err) {
            sendResponse({
              success: false,
              error: err instanceof Error ? err.message : 'Request failed',
            });
          }
        })();
        return true;
      }

      case 'REFRESH_TOKEN': {
        handleRefreshToken().then(sendResponse);
        return true;
      }

      case 'CAPTURE_SCREENSHOT': {
        const tabId = sender.tab?.id;
        if (tabId) {
          handleScreenshotCapture(tabId).then(sendResponse);
        } else {
          // If called from popup, get the active tab
          (async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
              const result = await handleScreenshotCapture(tab.id);
              sendResponse(result);
            } else {
              sendResponse({ success: false, error: 'No active tab found' });
            }
          })();
        }
        return true;
      }

      case 'UPLOAD_SCREENSHOT': {
        const { dataUrl } = payload as { dataUrl: string };
        handleUploadScreenshot(dataUrl).then(sendResponse);
        return true;
      }

      default: {
        // Handle login/logout via payload action
        if (payload?.action === 'login') {
          const { email, password } = payload as { action: string; email: string; password: string };
          handleLogin(email, password).then(sendResponse);
          return true;
        }
        if (payload?.action === 'logout') {
          handleLogout().then(sendResponse);
          return true;
        }
        sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
        return true;
      }
    }
  },
);
```

- [ ] **Step 2: Add alarms permission to manifest.json**

Add `"alarms"` to the `permissions` array in `extension/manifest.json`:

```json
"permissions": [
  "activeTab",
  "scripting",
  "storage",
  "tabs",
  "debugger",
  "alarms"
],
```

- [ ] **Step 3: Verify build succeeds**

```bash
cd extension
npm run build
```

Expected: Build completes. Service worker compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add extension/background/ extension/manifest.json
git commit -m "feat: add service worker with auth management, screenshot capture, and R2 upload"
```

---

### Task 6: Popup HTML & React Entry Point

**Files:**
- Create: `extension/popup/index.html`, `extension/popup/popup.tsx`, `extension/popup/popup.css`

- [ ] **Step 1: Create popup HTML**

```html
<!-- extension/popup/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Orbiter Bug Capture</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./popup.tsx"></script>
</body>
</html>
```

- [ ] **Step 2: Create popup CSS with Orbiter design tokens**

```css
/* extension/popup/popup.css */
@import "tailwindcss";

:root {
  /* Orbiter Indigo theme — light mode */
  --color-bg-page: #FAFAFA;
  --color-bg-surface: #FFFFFF;
  --color-bg-elevated: #FFFFFF;
  --color-bg-subtle: #F4F4F5;
  --color-bg-muted: #EDEDEF;

  --color-text-primary: #1C1C22;
  --color-text-secondary: #5C5C6B;
  --color-text-muted: #8B8B9A;
  --color-text-disabled: #B4B4C0;
  --color-text-inverse: #FAFAFA;

  --color-border-subtle: #EBEBEF;
  --color-border-default: #DDDDE3;
  --color-border-strong: #C2C2CC;

  --color-accent: #5B5FC7;
  --color-accent-hover: #4E52B0;
  --color-accent-muted: #E8E9F5;
  --color-accent-text: #4248A6;

  --color-success: #2E7D57;
  --color-success-muted: #E6F4ED;
  --color-warning: #B5850B;
  --color-warning-muted: #FEF5E0;
  --color-error: #C93B3B;
  --color-error-muted: #FCE9E9;
  --color-info: #3178B9;
  --color-info-muted: #E5F0FA;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 8px -2px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04);

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
}

@theme {
  --color-surface: var(--color-bg-surface);
  --color-page: var(--color-bg-page);
  --color-elevated: var(--color-bg-elevated);
  --color-subtle: var(--color-bg-subtle);
  --color-muted: var(--color-bg-muted);
  --color-primary: var(--color-text-primary);
  --color-secondary: var(--color-text-secondary);
  --color-accent: var(--color-accent);
  --color-accent-hover: var(--color-accent-hover);
  --color-accent-muted: var(--color-accent-muted);
  --color-error: var(--color-error);
  --color-success: var(--color-success);
}

body {
  width: 380px;
  min-height: 480px;
  max-height: 600px;
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-y: auto;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--color-border-default);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-strong);
}
```

- [ ] **Step 3: Create React entry point**

```tsx
// extension/popup/popup.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';
import { LoginForm } from './components/LoginForm';
import { BugCapture } from './components/BugCapture';
import { useExtAuth } from './hooks/useExtAuth';

function App() {
  const { user, isLoading, login, logout } = useExtAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[480px]">
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={login} />;
  }

  return <BugCapture user={user} onLogout={logout} />;
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 4: Commit**

```bash
git add extension/popup/index.html extension/popup/popup.tsx extension/popup/popup.css
git commit -m "feat: add popup HTML, React entry point, and Orbiter design tokens"
```

---

### Task 7: useExtAuth Hook

**Files:**
- Create: `extension/popup/hooks/useExtAuth.ts`

- [ ] **Step 1: Create auth hook**

```typescript
// extension/popup/hooks/useExtAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { getStoredUser, clearAuth } from '@ext/shared/storage';
import type { ExtUser, ExtMessageResponse } from '@ext/shared/types';

interface UseExtAuthReturn {
  user: ExtUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export function useExtAuth(): UseExtAuthReturn {
  const [user, setUser] = useState<ExtUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const storedUser = await getStoredUser();
        if (storedUser) {
          // Try to refresh the token to verify session is still valid
          const response: ExtMessageResponse = await chrome.runtime.sendMessage({
            type: 'REFRESH_TOKEN',
          });
          if (response.success) {
            setUser(storedUser);
          } else {
            await clearAuth();
          }
        }
      } catch {
        await clearAuth();
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const response: ExtMessageResponse<ExtUser> = await chrome.runtime.sendMessage({
        type: 'API_REQUEST',
        payload: { action: 'login', email, password },
      });

      if (response.success && response.data) {
        setUser(response.data);
        return true;
      }

      setError(response.error || 'Login failed');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await clearAuth();
    setUser(null);
    setError(null);
  }, []);

  return { user, isLoading, error, login, logout };
}
```

- [ ] **Step 2: Commit**

```bash
git add extension/popup/hooks/useExtAuth.ts
git commit -m "feat: add useExtAuth hook for extension auth state management"
```

---

### Task 8: useCapture Hook

**Files:**
- Create: `extension/popup/hooks/useCapture.ts`

- [ ] **Step 1: Create capture hook**

```typescript
// extension/popup/hooks/useCapture.ts
import { useState, useCallback, useEffect } from 'react';
import type { CapturedData, ExtMessageResponse } from '@ext/shared/types';

interface UseCaptureReturn {
  capturedData: CapturedData | null;
  screenshotDataUrl: string | null;
  isCapturing: boolean;
  captureError: string | null;
  capture: () => Promise<void>;
}

export function useCapture(): UseCaptureReturn {
  const [capturedData, setCapturedData] = useState<CapturedData | null>(null);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const capture = useCallback(async () => {
    setIsCapturing(true);
    setCaptureError(null);

    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        setCaptureError('No active tab found');
        return;
      }

      // Capture page data from content script
      let pageData: CapturedData | null = null;
      try {
        const pageResponse: ExtMessageResponse<CapturedData> =
          await chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_PAGE_DATA' });
        if (pageResponse.success && pageResponse.data) {
          pageData = pageResponse.data;
        }
      } catch {
        // Content script might not be injected — build partial data from tab info
        pageData = {
          url: tab.url || 'Unknown',
          consoleLogs: [],
          screenshot: null,
          device: 'Desktop',
          browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Unknown',
          os: navigator.platform.includes('Win') ? 'Windows' :
              navigator.platform.includes('Mac') ? 'macOS' : 'Unknown',
          viewport: { width: tab.width || 0, height: tab.height || 0 },
        };
      }

      // Capture screenshot via service worker
      let screenshot: string | null = null;
      try {
        const screenshotResponse: ExtMessageResponse<string> =
          await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
        if (screenshotResponse.success && screenshotResponse.data) {
          screenshot = screenshotResponse.data;
        }
      } catch {
        // Screenshot capture may fail on restricted pages — continue without it
      }

      if (pageData) {
        setCapturedData(pageData);
      }
      setScreenshotDataUrl(screenshot);
    } catch (err) {
      setCaptureError(err instanceof Error ? err.message : 'Capture failed');
    } finally {
      setIsCapturing(false);
    }
  }, []);

  // Auto-capture on mount
  useEffect(() => {
    capture();
  }, [capture]);

  return { capturedData, screenshotDataUrl, isCapturing, captureError, capture };
}
```

- [ ] **Step 2: Commit**

```bash
git add extension/popup/hooks/useCapture.ts
git commit -m "feat: add useCapture hook for page data and screenshot collection"
```

---

### Task 9: LoginForm Component

**Files:**
- Create: `extension/popup/components/LoginForm.tsx`

- [ ] **Step 1: Create LoginForm component**

```tsx
// extension/popup/components/LoginForm.tsx
import React, { useState, type FormEvent } from 'react';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const success = await onLogin(email, password);
    if (!success) {
      setError('Invalid email or password');
    }

    setIsSubmitting(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[480px] p-6">
      {/* Logo */}
      <div className="mb-6 text-center">
        <h1
          className="text-xl font-semibold"
          style={{ color: 'var(--color-accent)' }}
        >
          Orbiter
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Sign in to capture bugs
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            placeholder="you@company.com"
            className="w-full px-3 py-2 text-sm rounded-md outline-none transition-colors"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            className="w-full px-3 py-2 text-sm rounded-md outline-none transition-colors"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <p
            className="text-xs"
            style={{ color: 'var(--color-error)' }}
          >
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-text-inverse)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add extension/popup/components/LoginForm.tsx
git commit -m "feat: add LoginForm component with Orbiter design tokens"
```

---

### Task 10: ProjectSelector Component

**Files:**
- Create: `extension/popup/components/ProjectSelector.tsx`

- [ ] **Step 1: Create ProjectSelector component**

```tsx
// extension/popup/components/ProjectSelector.tsx
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@ext/shared/api';
import type { ExtProject } from '@ext/shared/types';

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
}

export function ProjectSelector({ selectedProjectId, onSelect }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<ExtProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      setIsLoading(true);
      const result = await apiRequest<ExtProject[]>('/projects?limit=100');

      if (result.success) {
        setProjects(result.data);
        // Auto-select first project if none selected
        if (!selectedProjectId && result.data.length > 0) {
          onSelect(result.data[0]._id);
        }
      } else {
        setError(result.error);
      }

      setIsLoading(false);
    }

    fetchProjects();
  }, []);

  if (isLoading) {
    return (
      <div
        className="h-9 rounded-md animate-pulse"
        style={{ background: 'var(--color-bg-subtle)' }}
      />
    );
  }

  if (error) {
    return (
      <p className="text-xs" style={{ color: 'var(--color-error)' }}>
        Failed to load projects
      </p>
    );
  }

  if (projects.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        No projects available
      </p>
    );
  }

  return (
    <div>
      <label
        htmlFor="project"
        className="block text-xs font-medium mb-1.5"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Project
      </label>
      <select
        id="project"
        value={selectedProjectId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-md outline-none appearance-none cursor-pointer"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-default)',
          color: 'var(--color-text-primary)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {projects.map((project) => (
          <option key={project._id} value={project._id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add extension/popup/components/ProjectSelector.tsx
git commit -m "feat: add ProjectSelector component with project fetching"
```

---

### Task 11: VoiceInput Component & Deepgram Integration

**Files:**
- Create: `extension/popup/components/VoiceInput.tsx`

- [ ] **Step 1: Create VoiceInput component**

```tsx
// extension/popup/components/VoiceInput.tsx
import React, { useState, useRef, useCallback } from 'react';
import { apiRequest } from '@ext/shared/api';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

interface DeepgramToken {
  token: string;
  expiresAt: number;
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);

    try {
      // Get short-lived Deepgram token from platform
      const tokenResult = await apiRequest<DeepgramToken>('/deepgram/token', {
        method: 'POST',
      });

      if (!tokenResult.success) {
        setError('Voice input unavailable');
        return;
      }

      const { token } = tokenResult.data;

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      // Connect to Deepgram WebSocket
      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&punctuate=true`,
        ['token', token],
      );
      wsRef.current = ws;

      ws.onopen = () => {
        setIsRecording(true);

        // Start MediaRecorder to send audio chunks
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };

        mediaRecorder.start(250); // Send chunks every 250ms
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const transcript = data.channel?.alternatives?.[0]?.transcript;
          if (transcript && data.is_final) {
            onTranscript(transcript);
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        setError('Voice connection failed');
        stopRecording();
      };

      ws.onclose = () => {
        setIsRecording(false);
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied');
      } else {
        setError('Failed to start recording');
      }
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        // Send close signal to Deepgram
        wsRef.current.send(JSON.stringify({ type: 'CloseStream' }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleRecording}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50"
        style={{
          background: isRecording ? 'var(--color-error-muted)' : 'var(--color-bg-subtle)',
          color: isRecording ? 'var(--color-error)' : 'var(--color-text-secondary)',
          border: `1px solid ${isRecording ? 'var(--color-error)' : 'var(--color-border-default)'}`,
          borderRadius: 'var(--radius-md)',
        }}
        title={isRecording ? 'Stop recording' : 'Start voice input'}
      >
        {/* Microphone icon (inline SVG to avoid extra dependency) */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
        {isRecording ? 'Stop' : 'Voice'}
      </button>

      {/* Recording indicator */}
      {isRecording && (
        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-error)' }}>
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: 'var(--color-error)' }}
          />
          Recording...
        </span>
      )}

      {error && (
        <span className="text-xs" style={{ color: 'var(--color-error)' }}>
          {error}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add extension/popup/components/VoiceInput.tsx
git commit -m "feat: add VoiceInput component with Deepgram WebSocket transcription"
```

---

### Task 12: BugCapture Component (Main Form)

**Files:**
- Create: `extension/popup/components/BugCapture.tsx`

- [ ] **Step 1: Create BugCapture component**

```tsx
// extension/popup/components/BugCapture.tsx
import React, { useState, useCallback } from 'react';
import { ProjectSelector } from './ProjectSelector';
import { VoiceInput } from './VoiceInput';
import { useCapture } from '../hooks/useCapture';
import { apiRequest, uploadScreenshot } from '@ext/shared/api';
import type { ExtUser, BugSubmission } from '@ext/shared/types';

interface BugCaptureProps {
  user: ExtUser;
  onLogout: () => void;
}

type SubmitState = 'idle' | 'uploading' | 'submitting' | 'success' | 'error';

export function BugCapture({ user, onLogout }: BugCaptureProps) {
  const { capturedData, screenshotDataUrl, isCapturing, captureError, capture } = useCapture();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleVoiceTranscript = useCallback((text: string) => {
    setDescription((prev) => {
      if (prev.length === 0) return text;
      return `${prev} ${text}`;
    });
  }, []);

  async function handleSubmit() {
    if (!title.trim() || !selectedProjectId) return;

    setSubmitError(null);

    // Upload screenshot if available
    let screenshotUrl: string | undefined;
    if (screenshotDataUrl) {
      setSubmitState('uploading');
      const response = await chrome.runtime.sendMessage({
        type: 'UPLOAD_SCREENSHOT',
        payload: { dataUrl: screenshotDataUrl },
      });
      if (response.success) {
        screenshotUrl = response.data;
      }
      // Continue even if screenshot upload fails
    }

    // Submit bug
    setSubmitState('submitting');

    const consoleLogs = capturedData?.consoleLogs
      ?.map((log) => `[${log.level.toUpperCase()}] ${log.message}`)
      .join('\n') || '';

    const bugData = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority: 'P2',
      source: 'extension',
      metadata: {
        url: capturedData?.url || 'Unknown',
        consoleLogs: consoleLogs || undefined,
        screenshot: screenshotUrl,
        device: capturedData?.device || 'Unknown',
        browser: capturedData?.browser || 'Unknown',
        os: capturedData?.os || 'Unknown',
        viewport: capturedData?.viewport || { width: 0, height: 0 },
      },
    };

    const result = await apiRequest(`/projects/${selectedProjectId}/bugs`, {
      method: 'POST',
      body: bugData,
    });

    if (result.success) {
      setSubmitState('success');
      // Reset form after a brief delay
      setTimeout(() => {
        setTitle('');
        setDescription('');
        setSubmitState('idle');
        capture(); // Re-capture for next bug
      }, 2000);
    } else {
      setSubmitState('error');
      setSubmitError(result.error);
    }
  }

  // Success state
  if (submitState === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] p-6">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'var(--color-success-muted)' }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--color-success)' }}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Bug reported
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Redirecting...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[480px]">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        <h1 className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
          Orbiter
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {user.name}
          </span>
          <button
            onClick={onLogout}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{
              color: 'var(--color-text-muted)',
              background: 'transparent',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Captured context banner */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ background: 'var(--color-bg-subtle)' }}
      >
        {isCapturing ? (
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Capturing page data...
          </span>
        ) : captureError ? (
          <span className="text-xs" style={{ color: 'var(--color-error)' }}>
            {captureError}
          </span>
        ) : (
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <span title={capturedData?.url}>
              {capturedData?.url
                ? capturedData.url.length > 35
                  ? `${capturedData.url.slice(0, 35)}...`
                  : capturedData.url
                : 'No URL'}
            </span>
            {screenshotDataUrl && (
              <span style={{ color: 'var(--color-success)' }}>Screenshot captured</span>
            )}
            {capturedData?.consoleLogs && capturedData.consoleLogs.length > 0 && (
              <span>
                {capturedData.consoleLogs.filter((l) => l.level === 'error').length} errors
              </span>
            )}
          </div>
        )}
        <button
          onClick={capture}
          disabled={isCapturing}
          className="text-xs px-2 py-1 rounded transition-colors disabled:opacity-50"
          style={{
            color: 'var(--color-accent-text)',
            background: 'var(--color-accent-muted)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          Re-capture
        </button>
      </div>

      {/* Screenshot preview */}
      {screenshotDataUrl && (
        <div className="px-4 pt-3">
          <img
            src={screenshotDataUrl}
            alt="Page screenshot"
            className="w-full rounded-md"
            style={{
              border: '1px solid var(--color-border-subtle)',
              maxHeight: '120px',
              objectFit: 'cover',
              objectPosition: 'top left',
              borderRadius: 'var(--radius-md)',
            }}
          />
        </div>
      )}

      {/* Form */}
      <div className="flex-1 p-4 space-y-3">
        {/* Project selector */}
        <ProjectSelector
          selectedProjectId={selectedProjectId}
          onSelect={setSelectedProjectId}
        />

        {/* Title */}
        <div>
          <label
            htmlFor="bug-title"
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Title
          </label>
          <input
            id="bug-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What went wrong?"
            autoFocus
            className="w-full px-3 py-2 text-sm rounded-md outline-none transition-colors"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
              borderRadius: 'var(--radius-md)',
            }}
          />
        </div>

        {/* Description with voice input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="bug-description"
              className="text-xs font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Description
            </label>
            <VoiceInput
              onTranscript={handleVoiceTranscript}
              disabled={submitState !== 'idle'}
            />
          </div>
          <textarea
            id="bug-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue or use voice input..."
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-md outline-none resize-none transition-colors"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
              borderRadius: 'var(--radius-md)',
            }}
          />
        </div>

        {/* Submit error */}
        {submitState === 'error' && submitError && (
          <p className="text-xs" style={{ color: 'var(--color-error)' }}>
            {submitError}
          </p>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !selectedProjectId || submitState === 'uploading' || submitState === 'submitting'}
          className="w-full py-2.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-text-inverse)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {submitState === 'uploading'
            ? 'Uploading screenshot...'
            : submitState === 'submitting'
              ? 'Submitting bug...'
              : 'Submit Bug Report'}
        </button>
      </div>

      {/* Footer: captured metadata summary */}
      {capturedData && (
        <div
          className="px-4 py-2 flex items-center gap-3 text-xs"
          style={{
            borderTop: '1px solid var(--color-border-subtle)',
            color: 'var(--color-text-muted)',
          }}
        >
          <span>{capturedData.browser}</span>
          <span>{capturedData.os}</span>
          <span>{capturedData.viewport.width}x{capturedData.viewport.height}</span>
          <span>{capturedData.device}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add extension/popup/components/BugCapture.tsx
git commit -m "feat: add BugCapture main form with screenshot preview and auto-capture"
```

---

### Task 13: Platform-Side Deepgram Token Endpoint

**Files:**
- Create: `src/modules/deepgram/deepgram.service.ts`, `src/modules/deepgram/deepgram.types.ts`, `src/app/api/v1/deepgram/token/route.ts`
- Update: `src/config/env.ts`

- [ ] **Step 1: Add DEEPGRAM_API_KEY to env validation**

In `src/config/env.ts`, add to the Zod schema:

```typescript
DEEPGRAM_API_KEY: z.string().optional().default(''),
```

- [ ] **Step 2: Create Deepgram types**

```typescript
// src/modules/deepgram/deepgram.types.ts
export interface DeepgramTokenResponse {
  token: string;
  expiresAt: number;
}
```

- [ ] **Step 3: Create Deepgram service**

```typescript
// src/modules/deepgram/deepgram.service.ts
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
```

- [ ] **Step 4: Create the API route**

```typescript
// src/app/api/v1/deepgram/token/route.ts
import { apiHandler } from '@/shared/middleware/api-handler';
import { authenticate } from '@/shared/middleware/auth';
import { DeepgramService } from '@/modules/deepgram/deepgram.service';

export const POST = apiHandler({
  middleware: [authenticate],
  handler: async () => {
    const token = await DeepgramService.generateToken();
    return { data: token, status: 200 };
  },
});
```

- [ ] **Step 5: Add DEEPGRAM_API_KEY to .env.example**

Append to `.env.example`:

```bash
# Deepgram (voice transcription for Chrome extension)
DEEPGRAM_API_KEY=
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/deepgram/ src/app/api/v1/deepgram/ src/config/env.ts .env.example
git commit -m "feat: add Deepgram token endpoint for short-lived voice transcription keys"
```

---

### Task 14: CORS Configuration for Extension

**Files:**
- Update: `src/shared/middleware/api-handler.ts` or `next.config.ts`

- [ ] **Step 1: Add CORS headers for extension origin**

In the `apiHandler` wrapper (or as a Next.js middleware), add CORS headers to allow requests from the Chrome extension. The extension's origin is `chrome-extension://<extension-id>`.

Add CORS handling to `src/shared/middleware/api-handler.ts`. In the response construction, add:

```typescript
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': req.headers.get('Origin') || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};
```

Apply these headers to all API responses. For production, restrict `Access-Control-Allow-Origin` to the known extension ID.

- [ ] **Step 2: Add OPTIONS handler for preflight requests**

In `api-handler.ts`, add automatic OPTIONS handling that returns `204` with CORS headers when the method is OPTIONS. This supports preflight requests from the extension.

```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, { status: 204, headers: corsHeaders });
}
```

- [ ] **Step 3: Add EXTENSION_ID to env config**

In `src/config/env.ts`, add:

```typescript
CHROME_EXTENSION_ID: z.string().optional().default(''),
```

Use this to restrict CORS in production:

```typescript
const allowedOrigins = [
  env.NEXT_PUBLIC_APP_URL,
  env.CHROME_EXTENSION_ID ? `chrome-extension://${env.CHROME_EXTENSION_ID}` : '',
].filter(Boolean);
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/middleware/api-handler.ts src/config/env.ts
git commit -m "feat: add CORS support for Chrome extension API requests"
```

---

### Task 15: Build Pipeline & Load Extension for Testing

**Files:**
- Update: `extension/vite.config.ts`, `extension/manifest.json`

- [ ] **Step 1: Add copy plugin for manifest and static assets**

Install `vite-plugin-static-copy` or add a manual copy step:

```bash
cd extension
npm install -D vite-plugin-static-copy
```

Update `extension/vite.config.ts` to copy `manifest.json` and `icons/` to the build output:

```typescript
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Add to plugins array:
viteStaticCopy({
  targets: [
    { src: 'manifest.json', dest: '.' },
    { src: 'icons/*', dest: 'icons' },
  ],
}),
```

- [ ] **Step 2: Build the extension**

```bash
cd extension
npm run build
```

Expected: `extension/build/` contains:
- `manifest.json`
- `popup/index.html` (with bundled JS/CSS)
- `service-worker.js`
- `content-script.js`
- `icons/` directory

- [ ] **Step 3: Load unpacked extension in Chrome**

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `extension/build/`
5. Note the generated extension ID

- [ ] **Step 4: Update .env.local with extension ID**

Add `CHROME_EXTENSION_ID=<the-generated-id>` to `.env.local`.

- [ ] **Step 5: Manual smoke test**

1. Click the Orbiter extension icon in Chrome toolbar
2. Verify the login form appears with Orbiter styling
3. Log in with platform credentials
4. Verify project selector loads projects
5. Verify page data (URL, browser, OS, viewport) is captured
6. Verify screenshot preview appears
7. Type a title, optionally use voice input
8. Submit bug report
9. Verify bug appears in the Orbiter platform bugs list with full metadata

- [ ] **Step 6: Commit**

```bash
git add extension/
git commit -m "chore: finalize extension build pipeline with asset copying"
```

---

### Task 16: Integration Tests for Deepgram Token Endpoint

**Files:**
- Create: `tests/integration/api/deepgram.test.ts`

- [ ] **Step 1: Write integration tests**

```typescript
// tests/integration/api/deepgram.test.ts
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
// Use test helpers from existing test infrastructure
import { getAuthToken } from '../../helpers/auth';
import { testRequest } from '../../helpers/request';

describe('POST /api/v1/deepgram/token', () => {
  let authToken: string;

  beforeAll(async () => {
    authToken = await getAuthToken();
  });

  it('returns 401 without auth token', async () => {
    const res = await testRequest.post('/api/v1/deepgram/token');
    expect(res.status).toBe(401);
  });

  it('returns 200 with a short-lived token when Deepgram is configured', async () => {
    // This test requires DEEPGRAM_API_KEY to be set
    // Skip in CI if not configured
    if (!process.env.DEEPGRAM_API_KEY) {
      return;
    }

    const res = await testRequest
      .post('/api/v1/deepgram/token')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('expiresAt');
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.expiresAt).toBeGreaterThan(Date.now());
  });

  it('returns 500 when Deepgram is not configured', async () => {
    // Temporarily unset the key
    const originalKey = process.env.DEEPGRAM_API_KEY;
    delete process.env.DEEPGRAM_API_KEY;

    const res = await testRequest
      .post('/api/v1/deepgram/token')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(500);

    // Restore
    if (originalKey) {
      process.env.DEEPGRAM_API_KEY = originalKey;
    }
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx jest tests/integration/api/deepgram.test.ts --no-cache
```

Expected: Tests pass (auth test always, Deepgram tests conditionally based on env).

- [ ] **Step 3: Commit**

```bash
git add tests/integration/api/deepgram.test.ts
git commit -m "test: add integration tests for Deepgram token endpoint"
```

---

### Task 17: Extension E2E Verification Checklist

This task is a manual verification checklist — no code to write.

- [ ] **Step 1: Verify extension loads without errors**
  - Open `chrome://extensions/` — no error badges on Orbiter extension
  - Open extension service worker console — no errors

- [ ] **Step 2: Verify login flow**
  - Click extension icon → login form renders
  - Enter valid credentials → redirects to capture form
  - Close and reopen popup → stays logged in (token persisted)
  - Wait 15+ minutes → token auto-refreshes (check service worker console)

- [ ] **Step 3: Verify capture flow**
  - Open a page with console errors (e.g., `console.error('test')` in DevTools)
  - Click extension → verify URL shows in context banner
  - Verify screenshot preview renders
  - Verify console error count in context banner

- [ ] **Step 4: Verify bug submission**
  - Fill in title, optionally description
  - Select a project
  - Click Submit
  - Verify success state appears
  - Open Orbiter platform → navigate to project bugs → verify new bug exists
  - Verify bug has: title, description, source: "extension", metadata (URL, browser, OS, viewport, console logs, screenshot URL)

- [ ] **Step 5: Verify voice input (if Deepgram configured)**
  - Click Voice button → browser requests mic permission
  - Speak → text appears in description field
  - Click Stop → recording stops cleanly
  - If Deepgram not configured → voice button shows "Voice input unavailable"

- [ ] **Step 6: Verify edge cases**
  - Try extension on `chrome://` pages → graceful fallback (no crash)
  - Try extension on `file://` pages → partial capture (URL at minimum)
  - Submit with empty title → button stays disabled
  - Network offline → submit shows error message
  - Logout → returns to login form, stored tokens cleared

- [ ] **Step 7: Commit any fixes discovered during verification**

```bash
git add -A
git commit -m "fix: address issues found during extension E2E verification"
```

---

## Dependency Graph

```
Task 1 (Scaffold) ──────────────────────────────────────────────────┐
Task 2 (Shared Utils) ──── depends on Task 1                       │
Task 3 (API Client) ──── depends on Task 2                         │
Task 4 (Content Script) ──── depends on Task 2                     │
Task 5 (Service Worker) ──── depends on Tasks 2, 3                 │
Task 6 (Popup Entry) ──── depends on Task 1                        │
Task 7 (useExtAuth) ──── depends on Tasks 2, 5, 6                  │
Task 8 (useCapture) ──── depends on Tasks 4, 5, 6                  │
Task 9 (LoginForm) ──── depends on Tasks 6, 7                      │
Task 10 (ProjectSelector) ──── depends on Tasks 3, 6               │
Task 11 (VoiceInput) ──── depends on Tasks 3, 6, 13                │
Task 12 (BugCapture) ──── depends on Tasks 8, 9, 10, 11            │
Task 13 (Deepgram Endpoint) ──── independent (platform side)       │
Task 14 (CORS) ──── independent (platform side)                    │
Task 15 (Build & Load) ──── depends on Tasks 1-12                  │
Task 16 (Deepgram Tests) ──── depends on Task 13                   │
Task 17 (E2E Checklist) ──── depends on Tasks 15, 16               │
```

### Parallelization Opportunities

```
Parallel group A (after Task 2):
  - Task 3 (API Client)
  - Task 4 (Content Script)

Parallel group B (platform side, any time):
  - Task 13 (Deepgram Endpoint)
  - Task 14 (CORS)
  - Task 16 (Deepgram Tests) — after Task 13

Parallel group C (after Tasks 5, 6):
  - Task 7 (useExtAuth)
  - Task 8 (useCapture)

Parallel group D (after group C):
  - Task 9 (LoginForm)
  - Task 10 (ProjectSelector)
  - Task 11 (VoiceInput)
```

---

## Summary

| # | Task | Est. Time | Dependencies |
|---|------|-----------|-------------|
| 1 | Extension scaffold & build system | 25 min | None |
| 2 | Shared utilities (storage, types, constants) | 20 min | Task 1 |
| 3 | API client with auth injection | 20 min | Task 2 |
| 4 | Content script (console, page info) | 25 min | Task 2 |
| 5 | Service worker (auth, screenshot, upload) | 30 min | Tasks 2-3 |
| 6 | Popup HTML & React entry | 15 min | Task 1 |
| 7 | useExtAuth hook | 20 min | Tasks 2, 5, 6 |
| 8 | useCapture hook | 20 min | Tasks 4, 5, 6 |
| 9 | LoginForm component | 15 min | Tasks 6, 7 |
| 10 | ProjectSelector component | 15 min | Tasks 3, 6 |
| 11 | VoiceInput component (Deepgram) | 25 min | Tasks 3, 6, 13 |
| 12 | BugCapture main form | 30 min | Tasks 8-11 |
| 13 | Deepgram token endpoint (platform) | 20 min | None |
| 14 | CORS config for extension | 15 min | None |
| 15 | Build pipeline & load test | 20 min | Tasks 1-12 |
| 16 | Deepgram integration tests | 15 min | Task 13 |
| 17 | E2E verification checklist | 30 min | Tasks 15, 16 |

**Total estimated time: ~6 hours**
