'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'client' && !pathname.startsWith('/portal')) {
        router.replace('/portal');
      }
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (cancelled) return;
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
        if (!cancelled) clearAuth();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
