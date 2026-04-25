'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from '@phosphor-icons/react';
import Avatar from 'boring-avatars';
import { useAuth } from '@/hooks/use-auth';
import { useUnreadCount } from '@/hooks/queries/use-notifications';
import { NotificationDropdown } from '@/components/features/notifications/notification-dropdown';
import { ThemeToggle } from '@/components/shared/theme-toggle';

export function Topbar() {
  const { user } = useAuth();
  const { data: unreadData } = useUnreadCount();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = (unreadData as { count?: number })?.count ?? 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-subtle bg-surface px-6">
      <h1 className="text-base font-semibold tracking-tight text-primary">
        Projects
      </h1>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowDropdown((prev) => !prev)}
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-secondary transition-colors duration-[120ms] ease-[ease] hover:bg-subtle"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 h-[7px] w-[7px] rounded-full border-2 border-surface bg-[var(--color-error)]" />
            )}
          </button>

          {showDropdown && (
            <NotificationDropdown onClose={() => setShowDropdown(false)} />
          )}
        </div>

        <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full">
          <Avatar
            size={28}
            variant="beam"
            name={user?.name ?? 'User'}
            colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']}
          />
        </div>
      </div>
    </header>
  );
}
