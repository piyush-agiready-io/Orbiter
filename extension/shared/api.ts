import { API_BASE_URL } from './constants';
import { getStoredTokens, isTokenExpired } from './storage';
import type { ExtMessageResponse } from './types';

async function getAccessToken(): Promise<string | null> {
  try {
    const expired = await isTokenExpired();

    if (expired) {
      const response: ExtMessageResponse = await chrome.runtime.sendMessage({
        type: 'REFRESH_TOKEN',
      });
      if (!response?.success) return null;
    }

    const tokens = await getStoredTokens();
    return tokens?.accessToken || null;
  } catch {
    // Service worker may not be ready or connection may have dropped
    return null;
  }
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

  try {
    if (requireAuth) {
      const token = await getAccessToken();
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

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
