import { useState, useEffect, useCallback, useRef } from 'react';
import { getStoredUser, getStoredTokens, storeTokens, storeUser, clearAuth } from '@ext/shared/storage';
import { API_BASE_URL } from '@ext/shared/constants';
import type { ExtUser } from '@ext/shared/types';

const TOKEN_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function checkAuth() {
      try {
        const [storedTokens, storedUser] = await Promise.all([
          getStoredTokens().catch(() => null),
          getStoredUser().catch(() => null),
        ]);

        if (!mountedRef.current) return;

        if (storedTokens?.accessToken && storedUser) {
          const isExpired = storedTokens.tokenExpiry && Date.now() >= storedTokens.tokenExpiry - 60000;
          if (!isExpired) {
            setUser(storedUser);
            setIsLoading(false);
            return;
          }
        }

        if (mountedRef.current) {
          setUser(null);
          setIsLoading(false);
        }
      } catch {
        if (mountedRef.current) {
          setUser(null);
          setIsLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success && data.data?.accessToken) {
        const userData = data.data.user;
        await storeTokens(data.data.accessToken, TOKEN_DURATION_MS).catch(() => {});
        await storeUser(userData).catch(() => {});
        setUser(userData);
        setIsLoading(false);
        return true;
      }

      setError(data.error?.message || 'Login failed');
      setIsLoading(false);
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await clearAuth().catch(() => {});
    setUser(null);
    setError(null);
  }, []);

  return { user, isLoading, error, login, logout };
}
