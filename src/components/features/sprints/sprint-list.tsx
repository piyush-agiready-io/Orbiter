'use client';

import { Timer, Play, CheckCircle, Plus } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSprints, useUpdateSprint } from '@/hooks/queries/use-sprints';
import { InfoTip } from '@/components/shared/info-tip';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; style: string }> = {
  planning: {
    icon: <Timer size={14} />,
    style: 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]',
  },
  active: {
    icon: <Play size={14} weight="fill" />,
    style: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]',
  },
  closed: {
    icon: <CheckCircle size={14} weight="fill" />,
    style: 'bg-[var(--color-success-muted)] text-[var(--color-success)]',
  },
};

interface SprintListProps {
  projectId: string;
  onSelect: (sprintId: string) => void;
  onClose: (sprintId: string) => void;
  onCreate: () => void;
}

export function SprintList({ projectId, onSelect, onClose, onCreate }: SprintListProps) {
  const { data, isLoading } = useSprints(projectId);
  const updateSprint = useUpdateSprint(projectId);

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-[var(--color-border-subtle)] bg-surface p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>
    );
  }

  const sprints = data?.sprints ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-primary">Sprints</h2>
          <InfoTip text="Sprints are time-boxed iterations (1-2 weeks). Create a sprint, start it, add tasks, then close it when done to track velocity." />
        </div>
        <Button size="sm" onClick={onCreate}>
          <Plus size={16} className="mr-1" /> New Sprint
        </Button>
      </div>

      {sprints.length === 0 ? (
        <div className="py-12 text-center">
          <Timer size={32} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-muted)]">No sprints yet</p>
          <Button size="sm" variant="ghost" className="mt-2" onClick={onCreate}>Create your first sprint</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sprints.map((sprint) => {
            const config = STATUS_CONFIG[sprint.status];
            return (
              <div
                key={sprint.id}
                onClick={() => onSelect(sprint.id)}
                className="rounded-lg border border-[var(--color-border-subtle)] bg-surface p-4 card-hover cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-primary">{sprint.name}</h3>
                    <Badge className={config.style}>
                      <span className="mr-1">{config.icon}</span>
                      {sprint.status}
                    </Badge>
                  </div>
                  {sprint.status === 'planning' && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSprint.mutate({ sprintId: sprint.id, data: { status: 'active' } });
                      }}
                      disabled={updateSprint.isPending}
                    >
                      <Play size={14} weight="fill" className="mr-1" />
                      Start Sprint
                    </Button>
                  )}
                  {sprint.status === 'active' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => { e.stopPropagation(); onClose(sprint.id); }}
                    >
                      Close Sprint
                    </Button>
                  )}
                </div>

                {sprint.goal && (
                  <p className="text-sm text-secondary mb-2">{sprint.goal}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                  <span>{format(new Date(sprint.startDate), 'MMM d')} – {format(new Date(sprint.endDate), 'MMM d, yyyy')}</span>
                  {sprint.status === 'closed' && (
                    <span>
                      Velocity: {sprint.velocity.completed}/{sprint.velocity.planned} tasks
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
