'use client';

import { formatDistanceToNow } from 'date-fns';
import Avatar from 'boring-avatars';
import {
  CheckCircle,
  Bug,
  Timer,
  ChatText,
  UserPlus,
  UserMinus,
  Pencil,
  FileText,
  LinkSimple,
  GitBranch,
  Plus,
  X,
} from '@phosphor-icons/react';
import { useProjectActivity, useDeleteActivity } from '@/hooks/queries/use-activity';
import { useAuth } from '@/hooks/use-auth';

const AVATAR_COLORS = ['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9'];

const ACTION_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  task_created: { icon: Plus, label: 'created task', color: 'text-accent' },
  task_updated: { icon: Pencil, label: 'updated task', color: 'text-secondary' },
  task_status_changed: { icon: CheckCircle, label: 'changed status of', color: 'text-success' },
  task_deleted: { icon: CheckCircle, label: 'deleted task', color: 'text-[var(--color-error)]' },
  bug_created: { icon: Bug, label: 'reported bug', color: 'text-[var(--color-error)]' },
  bug_status_changed: { icon: Bug, label: 'updated bug status', color: 'text-[var(--color-warning)]' },
  sprint_created: { icon: Timer, label: 'created sprint', color: 'text-accent' },
  sprint_started: { icon: Timer, label: 'started sprint', color: 'text-success' },
  sprint_closed: { icon: Timer, label: 'closed sprint', color: 'text-secondary' },
  comment_added: { icon: ChatText, label: 'commented on', color: 'text-info' },
  member_added: { icon: UserPlus, label: 'added member', color: 'text-success' },
  member_removed: { icon: UserMinus, label: 'removed member', color: 'text-[var(--color-error)]' },
  project_updated: { icon: Pencil, label: 'updated project', color: 'text-secondary' },
  doc_created: { icon: FileText, label: 'created doc', color: 'text-accent' },
  doc_updated: { icon: FileText, label: 'updated doc', color: 'text-secondary' },
  link_added: { icon: LinkSimple, label: 'added link', color: 'text-accent' },
  github_synced: { icon: GitBranch, label: 'synced GitHub', color: 'text-secondary' },
};

export function ActivityFeed({ projectId }: { projectId: string }) {
  const { data, isLoading } = useProjectActivity(projectId);
  const deleteActivity = useDeleteActivity();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const response = data as { activities?: Array<{
    id: string;
    actor: { name: string };
    action: string;
    targetTitle?: string;
    createdAt: string;
  }> } | undefined;
  const activities = response?.activities ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="h-7 w-7 rounded-full bg-subtle" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-3/4 rounded bg-subtle" />
              <div className="h-3 w-1/4 rounded bg-subtle" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-secondary">
        No activity yet. Actions like creating tasks, filing bugs, and managing sprints will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => {
        const config = ACTION_CONFIG[activity.action] ?? {
          icon: Pencil,
          label: activity.action.replace(/_/g, ' '),
          color: 'text-secondary',
        };
        const Icon = config.icon;

        return (
          <div key={activity.id} className="group flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-subtle">
            <div className="relative mt-0.5 shrink-0">
              <Avatar
                size={28}
                variant="beam"
                name={activity.actor?.name ?? 'User'}
                colors={AVATAR_COLORS}
              />
              <div className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface ${config.color}`}>
                <Icon size={10} weight="bold" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-primary">
                <span className="font-medium">{activity.actor?.name ?? 'Unknown'}</span>
                {' '}
                <span className="text-secondary">{config.label}</span>
                {activity.targetTitle && (
                  <>
                    {' '}
                    <span className="font-medium">{activity.targetTitle}</span>
                  </>
                )}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => deleteActivity.mutate(activity.id)}
                className="mt-0.5 rounded p-0.5 text-[var(--color-text-muted)] opacity-0 transition-opacity hover:bg-subtle hover:text-primary group-hover:opacity-100"
                aria-label="Delete activity entry"
                title="Delete activity entry"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
