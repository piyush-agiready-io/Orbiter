'use client';

import { useRouter } from 'next/navigation';
import { Bug, UserCircle, Flag, GitBranch, At, Bell, X } from '@phosphor-icons/react';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllRead,
  useDeleteNotification,
} from '@/hooks/queries/use-notifications';
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
      return <Bug size={16} weight="fill" className="shrink-0 text-[var(--color-error)]" />;
    case 'task_assigned':
      return <UserCircle size={16} weight="fill" className="shrink-0 text-[var(--color-accent)]" />;
    case 'comment_mention':
      return <At size={16} weight="bold" className="shrink-0 text-[var(--color-info)]" />;
    case 'priority_changed':
      return <Flag size={16} weight="fill" className="shrink-0 text-[var(--color-warning)]" />;
    case 'github_digest':
      return <GitBranch size={16} className="shrink-0 text-[var(--color-success)]" />;
    default:
      return <Bell size={16} className="shrink-0 text-secondary" />;
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
  const deleteNotification = useDeleteNotification();

  const notifications: NotificationItem[] =
    (data as { notifications?: NotificationItem[] })?.notifications ?? [];

  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleClick(notification: NotificationItem) {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
    onClose();
  }

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-subtle bg-surface shadow-xl">
      <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary">Notifications</span>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            Mark all read
          </Button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading && (
          <div className="space-y-1 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-lg p-2.5">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-10">
            <Bell size={28} className="mb-2 text-[var(--color-text-muted)]" />
            <p className="text-sm text-[var(--color-text-muted)]">No notifications yet</p>
          </div>
        )}

        <div className="p-1.5">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`group relative flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-100 ${
                !notification.read
                  ? 'bg-[var(--color-accent-muted)]/40 hover:bg-[var(--color-accent-muted)]/60'
                  : 'hover:bg-subtle'
              }`}
            >
              <button
                type="button"
                onClick={() => handleClick(notification)}
                className="flex flex-1 min-w-0 items-start gap-3 text-left"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-subtle">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm leading-snug ${!notification.read ? 'font-semibold text-primary' : 'text-secondary'}`}>
                    {notification.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)] line-clamp-2">{notification.message}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">{timeAgo(notification.createdAt)}</p>
                </div>
              </button>
              <div className="ml-1 flex shrink-0 items-center gap-1.5">
                {!notification.read && (
                  <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification.mutate(notification.id);
                  }}
                  className="rounded p-0.5 text-[var(--color-text-muted)] opacity-0 transition-opacity hover:bg-subtle hover:text-primary group-hover:opacity-100"
                  aria-label="Delete notification"
                  title="Delete notification"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
