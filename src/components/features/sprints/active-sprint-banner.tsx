'use client';

import Link from 'next/link';
import { Play, ArrowRight } from '@phosphor-icons/react';
import { format, differenceInCalendarDays } from 'date-fns';
import { useSprints } from '@/hooks/queries/use-sprints';

interface ActiveSprintBannerProps {
  projectId: string;
}

export function ActiveSprintBanner({ projectId }: ActiveSprintBannerProps) {
  const { data } = useSprints(projectId, { status: 'active', limit: '1' });
  const active = data?.sprints?.[0];
  if (!active) return null;

  const daysLeft = differenceInCalendarDays(new Date(active.endDate), new Date());

  return (
    <Link
      href={`/projects/${projectId}/sprints`}
      className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-md border border-accent/20 bg-accent-muted/30 px-3 py-2 text-sm transition-colors hover:bg-accent-muted/50"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Play size={14} weight="fill" className="text-[var(--color-accent)] shrink-0" />
        <span className="font-medium text-primary truncate">{active.name}</span>
        {active.goal && (
          <span className="text-secondary truncate">— {active.goal}</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-muted">
        <span>
          {daysLeft > 0
            ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
            : daysLeft === 0
              ? 'Ends today'
              : `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`}
        </span>
        <span>·</span>
        <span>
          {format(new Date(active.endDate), 'MMM d')}
        </span>
        <ArrowRight size={12} className="text-secondary" />
      </div>
    </Link>
  );
}
