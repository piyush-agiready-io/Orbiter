'use client';

import { useRouter } from 'next/navigation';
import { Bug, UserCircle, ChatCircle, Flag } from '@phosphor-icons/react';
import { useNotifications, useMarkAsRead, useMarkAllRead } from '@/hooks/queries/use-notifications';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'bug_created':
      return <Bug size={16} className="shrink-0 text-[var(--color-error)]" />;
    case 'task_assigned':
      return <UserCircle size={16} className="shrink-0 text-[var(--color-accent)]" />;
    case 'comment_mention':
      return <ChatCircle size={16} className="shrink-0 text-[var(--color-info)]" />;
    case 'priority_changed':
      return <Flag size={16} className="shrink-0 text-[var(--color-warning)]" />;
    default:
      return <Bug size={16} className="shrink-0 text-secondary" />;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const router = useRouter();
  const { data, isLoading } = useNotifications({ limit: '20' });
  const markAsRead = useMarkAsRead();
  const markAllRead = useMarkAllRead();

  const notifications: NotificationItem[] =
    (data as { notifications?: NotificationItem[] })?.notifications ?? [];

  function handleClick(notification: NotificationItem) {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
    onClose();
  }

  function handleMarkAllRead() {
    markAllRead.mutate();
  }

  return (
    <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border border-default bg-surface shadow-lg">
      <div className="flex items-center justify-between border-b border-subtle px-3 py-2">
        <span className="text-sm font-medium text-primary">Notifications</span>
        <Button
          variant="ghost"
          size="xs"
          onClick={handleMarkAllRead}
          disabled={markAllRead.isPending}
        >
          Mark all read
        </Button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {isLoading && (
          <div className="space-y-2 p-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted">
            No notifications
          </div>
        )}

        {notifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() => handleClick(notification)}
            className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors duration-[120ms] ease-[ease] hover:bg-subtle ${
              !notification.read ? 'bg-[var(--color-accent-muted)]/30' : ''
            }`}
          >
            <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm ${
                  !notification.read ? 'font-medium text-primary' : 'text-secondary'
                }`}
              >
                {notification.title}
              </p>
              <p className="truncate text-xs text-muted">{notification.message}</p>
              <p className="mt-0.5 text-xs text-muted">{timeAgo(notification.createdAt)}</p>
            </div>
            {!notification.read && (
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent)]" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
