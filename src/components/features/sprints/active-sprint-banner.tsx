'use client';

import { Play, X } from '@phosphor-icons/react';
import { format, differenceInCalendarDays } from 'date-fns';
import { useSprints } from '@/hooks/queries/use-sprints';
import { Button } from '@/components/ui/button';

interface ActiveSprintBannerProps {
  projectId: string;
  onActivate: (sprintId: string) => void;
  active?: string;
}

export function ActiveSprintBanner({
  projectId,
  onActivate,
  active,
}: ActiveSprintBannerProps) {
  const { data } = useSprints(projectId, { status: 'active', limit: '1' });
  const sprint = data?.sprints?.[0];
  if (!sprint) return null;

  const daysLeft = differenceInCalendarDays(new Date(sprint.endDate), new Date());
  const isFiltered = active === sprint.id;

  return (
    <div className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-md border border-accent/20 bg-accent-muted/30 px-3 py-2 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <Play size={14} weight="fill" className="text-[var(--color-accent)] shrink-0" />
        <span className="font-medium text-primary truncate">{sprint.name}</span>
        {sprint.goal && (
          <span className="text-secondary truncate">— {sprint.goal}</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
        <span>
          {daysLeft > 0
            ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
            : daysLeft === 0
              ? 'Ends today'
              : `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`}
        </span>
        <span>·</span>
        <span>{format(new Date(sprint.endDate), 'MMM d')}</span>
        {isFiltered ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onActivate('')}
            className="h-7 px-2"
          >
            <X size={12} className="mr-1" />
            Show all
          </Button>
        ) : (
          <Button size="sm" onClick={() => onActivate(sprint.id)} className="h-7 px-2">
            Focus board
          </Button>
        )}
      </div>
    </div>
  );
}
