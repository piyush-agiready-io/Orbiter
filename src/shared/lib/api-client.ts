import { useAuth } from '@/hooks/use-auth';

const BASE_URL = '/api/v1';

class ApiClient {
  private getToken(): string | null {
    return useAuth.getState().accessToken;
  }

  private async refreshToken(): Promise<string | null> {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      const token = data.data.accessToken;
      useAuth.getState().setAuth(data.data.user, token);
      return token;
    } catch {
      return null;
    }
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

    if (res.status === 401) {
      const newToken = await this.refreshToken();
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
      } else {
        useAuth.getState().clearAuth();
        if (typeof window !== 'undefined') window.location.href = '/login';
        throw new Error('Session expired');
      }
    }

    const json = await res.json();
    if (!json.success) {
      throw new ApiError(json.error.code, json.error.message, json.error.details);
    }
    return json.data;
  }

  get<T>(path: string, params?: Record<string, string>) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<T>(`${path}${query}`);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export class ApiError extends Error {
  code: string;
  details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export const api = new ApiClient();
