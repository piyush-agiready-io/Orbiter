import { API_BASE_URL, STORAGE_KEYS } from '@ext/shared/constants';
import {
  storeTokens,
  storeUser,
  clearAuth,
  getStoredTokens,
  isTokenExpired,
} from '@ext/shared/storage';
import type { ExtMessage, ExtMessageResponse, ExtUser } from '@ext/shared/types';

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
  _tabId: number,
): Promise<ExtMessageResponse<string>> {
  try {
    const dataUrl: string = await chrome.tabs.captureVisibleTab(
      chrome.windows.WINDOW_ID_CURRENT,
      { format: 'png', quality: 100 },
    );

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
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const filename = `bug-screenshot-${Date.now()}.png`;

    const tokens = await getStoredTokens();
    if (!tokens?.accessToken) {
      return { success: false, error: 'Not authenticated' };
    }

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

chrome.alarms.create('token-refresh', { periodInMinutes: 12 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'token-refresh') {
    const expired = await isTokenExpired();
    if (expired) {
      await handleRefreshToken();
    }
  }
});

chrome.runtime.onMessage.addListener(
  (
    message: ExtMessage & { payload?: Record<string, unknown> },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtMessageResponse) => void,
  ) => {
    const payload = message.payload as Record<string, unknown> | undefined;

    switch (message.type) {
      case 'API_REQUEST': {
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
