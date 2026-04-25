'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, SignOut, Gear, List } from '@phosphor-icons/react';
import Avatar from 'boring-avatars';
import { useAuth } from '@/hooks/use-auth';
import { useUnreadCount } from '@/hooks/queries/use-notifications';
import { NotificationDropdown } from '@/components/features/notifications/notification-dropdown';
import { ThemeToggle } from '@/components/shared/theme-toggle';

export function Topbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user, clearAuth } = useAuth();
  const router = useRouter();
  const { data: unreadData } = useUnreadCount();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = (unreadData as { count?: number })?.count ?? 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    if (showNotifications || showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications, showUserMenu]);

  function handleLogout() {
    clearAuth();
    router.push('/login');
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-subtle bg-surface px-4 md:px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex h-8 w-8 items-center justify-center rounded-md text-secondary transition-colors hover:bg-subtle md:hidden"
          aria-label="Toggle menu"
        >
          <List size={20} />
        </button>
        <h1 className="text-base font-semibold tracking-tight text-primary">
          Projects
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifications((prev) => !prev)}
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-secondary transition-colors duration-[120ms] ease-[ease] hover:bg-subtle"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 h-[7px] w-[7px] rounded-full border-2 border-surface bg-[var(--color-error)]" />
            )}
          </button>
          {showNotifications && (
            <NotificationDropdown onClose={() => setShowNotifications(false)} />
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu((prev) => !prev)}
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-2 ring-transparent transition-all duration-[120ms] hover:ring-accent/30"
          >
            <Avatar
              size={28}
              variant="beam"
              name={user?.name ?? 'User'}
              colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']}
            />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-10 z-50 w-52 rounded-lg border border-subtle bg-surface py-1 shadow-md">
              <div className="border-b border-subtle px-3 py-2.5">
                <p className="text-sm font-medium text-primary truncate">{user?.name}</p>
                <p className="text-xs text-muted truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { setShowUserMenu(false); router.push('/settings'); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary transition-colors hover:bg-subtle"
              >
                <Gear size={16} />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-error)] transition-colors hover:bg-subtle"
              >
                <SignOut size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
