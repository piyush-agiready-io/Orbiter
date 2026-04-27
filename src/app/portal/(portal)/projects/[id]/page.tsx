'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { format, differenceInCalendarDays, formatDistanceToNow } from 'date-fns';
import {
  Bug,
  Play,
  Sparkle,
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePortalOverview } from '@/hooks/queries/use-portal-data';
import { PortalProgressCard } from '@/components/features/portal/portal-progress-card';
import { PortalBugReportDialog } from '@/components/features/portal/portal-bug-report-dialog';

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  task_status_changed: <CheckCircle size={14} className="text-[var(--color-success)]" />,
  sprint_started: <Play size={14} weight="fill" className="text-[var(--color-accent)]" />,
  sprint_closed: <CheckCircle size={14} weight="fill" className="text-[var(--color-success)]" />,
  bug_status_changed: <Bug size={14} className="text-[var(--color-warning)]" />,
};

function activitySentence(a: {
  action: string;
  actorName: string;
  targetTitle?: string;
  meta?: Record<string, unknown>;
}): string {
  const title = a.targetTitle ?? 'an item';
  switch (a.action) {
    case 'task_status_changed': {
      const status = (a.meta?.status as string) ?? 'updated';
      return `${a.actorName} marked "${title}" as ${status.replace('_', ' ')}`;
    }
    case 'sprint_started':
      return `${a.actorName} started sprint "${title}"`;
    case 'sprint_closed':
      return `${a.actorName} closed sprint "${title}"`;
    case 'bug_status_changed': {
      const status = (a.meta?.status as string) ?? 'updated';
      return `${a.actorName} marked bug "${title}" as ${status}`;
    }
    default:
      return `${a.actorName} updated ${title}`;
  }
}

export default function PortalProjectOverviewPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = usePortalOverview(params.id);
  const [bugDialogOpen, setBugDialogOpen] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-48 animate-pulse rounded-lg bg-subtle" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-40 animate-pulse rounded-lg bg-subtle" />
          <div className="h-40 animate-pulse rounded-lg bg-subtle" />
        </div>
      </div>
    );
  }

  const { progress, activeSprint, bugs, recentActivity } = data;
  const sprintDaysLeft = activeSprint
    ? differenceInCalendarDays(new Date(activeSprint.endDate), new Date())
    : 0;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-primary">Project Overview</h2>
          <p className="text-sm text-secondary">
            How things are going across the project right now.
          </p>
        </div>
        <Button onClick={() => setBugDialogOpen(true)}>
          <Bug size={16} className="mr-1.5" />
          Report a Bug
        </Button>
      </div>

      <PortalProgressCard
        total={progress.total}
        done={progress.done}
        inProgress={progress.inProgress}
        backlog={progress.backlog}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Active Sprint */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Play size={16} weight="fill" className="text-[var(--color-accent)]" />
              Current Sprint
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeSprint ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-primary">
                    {activeSprint.name}
                  </p>
                  {activeSprint.goal && (
                    <p className="mt-0.5 text-sm text-secondary">
                      {activeSprint.goal}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>
                    {format(new Date(activeSprint.startDate), 'MMM d')} –{' '}
                    {format(new Date(activeSprint.endDate), 'MMM d, yyyy')}
                  </span>
                  <span
                    className={
                      sprintDaysLeft < 0
                        ? 'text-[var(--color-error)]'
                        : sprintDaysLeft <= 2
                          ? 'text-[var(--color-warning)]'
                          : ''
                    }
                  >
                    {sprintDaysLeft > 0
                      ? `${sprintDaysLeft} day${sprintDaysLeft === 1 ? '' : 's'} left`
                      : sprintDaysLeft === 0
                        ? 'Ends today'
                        : `${Math.abs(sprintDaysLeft)} day${Math.abs(sprintDaysLeft) === 1 ? '' : 's'} overdue`}
                  </span>
                </div>
                {activeSprint.progress && activeSprint.progress.total > 0 && (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-secondary">
                      <span>Sprint progress</span>
                      <span>
                        {activeSprint.progress.done}/{activeSprint.progress.total} ·{' '}
                        {activeSprint.progress.percentage}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-accent-muted">
                      <div
                        className="h-2 rounded-full bg-accent transition-all duration-300"
                        style={{ width: `${activeSprint.progress.percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted">
                No sprint is active right now.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Bugs you've reported */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <WarningCircle size={16} className="text-[var(--color-warning)]" />
              Your Reported Bugs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bugs.open === 0 ? (
              <p className="py-2 text-sm text-muted">
                No open bugs from you. If something looks off,{' '}
                <button
                  type="button"
                  onClick={() => setBugDialogOpen(true)}
                  className="font-medium text-[var(--color-accent)] hover:underline"
                >
                  report it
                </button>
                .
              </p>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold text-primary">{bugs.open}</p>
                  <p className="text-xs text-muted">
                    open or being investigated
                  </p>
                </div>
                <a
                  href={`/portal/projects/${params.id}/bugs`}
                  className="text-sm font-medium text-[var(--color-accent)] hover:underline"
                >
                  View all →
                </a>
              </div>
            )}
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => setBugDialogOpen(true)}
            >
              <Bug size={14} className="mr-1.5" />
              Report a New Bug
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkle size={16} weight="fill" className="text-[var(--color-accent)]" />
            Recent Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">
              No recent activity yet. Updates will appear here as the team works.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {recentActivity.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {ACTIVITY_ICONS[a.action] ?? (
                      <Badge className="h-3 w-3 p-0" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary">
                      {activitySentence(a)}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDistanceToNow(new Date(a.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <PortalBugReportDialog
        projectId={params.id}
        open={bugDialogOpen}
        onClose={() => setBugDialogOpen(false)}
      />
    </div>
  );
}
