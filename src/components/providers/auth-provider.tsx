'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuth();
  // Only block rendering when we have NO cached auth at all. With a cached
  // token from localStorage we render immediately and validate in the
  // background — queries can fire right away instead of waiting on a
  // roundtrip to /auth/refresh.
  const [isChecking, setIsChecking] = useState(!isAuthenticated);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Already authenticated (cache hydrated). Trust the cached state —
    // the api-client refreshes the access token lazily on the first 401
    // and clears auth if that refresh fails. A separate eager validate
    // here was bouncing users to /login whenever the refresh cookie was
    // momentarily stale (e.g. immediately after login when an old
    // path-scoped cookie shadowed the new one).
    if (isAuthenticated && user) {
      if (user.role === 'client' && !pathname.startsWith('/portal')) {
        router.replace('/portal');
      }
      setIsChecking(false);
      return;
    }

    async function checkAuth() {
      try {
        const res = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setAuth(data.data.user, data.data.accessToken);

          if (data.data.user.role === 'client' && !pathname.startsWith('/portal')) {
            router.replace('/portal');
          }
        } else {
          clearAuth();
          if (!PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
            router.replace('/login');
          }
        }
      } catch {
        clearAuth();
      } finally {
        setIsChecking(false);
      }
    }

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-page">
        <div className="h-8 w-32 animate-pulse rounded-md bg-subtle" />
      </div>
    );
  }

  return <>{children}</>;
}
