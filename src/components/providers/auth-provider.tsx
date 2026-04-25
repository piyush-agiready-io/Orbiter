'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuth();
  const [isChecking, setIsChecking] = useState(!isAuthenticated);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
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
