'use client';

import { useMemo } from 'react';
import { subWeeks, addWeeks, min, max } from 'date-fns';
import { TimelineHeader } from './timeline-header';
import { TimelineRow } from './timeline-row';
import type { TimelineSprint, TimelineEpic } from '@/hooks/queries/use-timeline';

interface TimelineChartProps {
  sprints: TimelineSprint[];
  epics: TimelineEpic[];
  isLoading?: boolean;
}

const SPRINT_STATUS_TO_BAR: Record<string, string> = {
  planning: 'planning',
  active: 'active',
  closed: 'done',
};

const EPIC_STATUS_TO_BAR: Record<string, string> = {
  planning: 'planning',
  active: 'active',
  done: 'done',
};

export function TimelineChart({ sprints, epics, isLoading }: TimelineChartProps) {
  const { timelineStart, timelineEnd } = useMemo(() => {
    const allDates = [
      ...sprints.flatMap((s) => [new Date(s.startDate), new Date(s.endDate)]),
      ...epics.flatMap((e) => [new Date(e.startDate), new Date(e.endDate)]),
    ];

    if (allDates.length === 0) {
      const now = new Date();
      return { timelineStart: subWeeks(now, 2), timelineEnd: addWeeks(now, 6) };
    }

    return {
      timelineStart: subWeeks(min(allDates), 1),
      timelineEnd: addWeeks(max(allDates), 2),
    };
  }, [sprints, epics]);

  if (isLoading) {
    return (
      <div className="space-y-3 rounded-lg border border-border-subtle bg-surface p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex h-12 items-center gap-4">
            <div className="h-4 w-32 animate-pulse rounded bg-subtle" />
            <div className="h-6 flex-1 animate-pulse rounded bg-subtle" />
          </div>
        ))}
      </div>
    );
  }

  if (sprints.length === 0 && epics.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface px-4 py-12 text-center text-secondary">
        Nothing to show. Create sprints or epics with start and end dates to see them here.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sprints.length > 0 && (
        <Section
          label="Sprint"
          rows={sprints.map((s) => ({
            id: s.id,
            title: s.name,
            startDate: new Date(s.startDate),
            endDate: new Date(s.endDate),
            progress: s.progress,
            status: SPRINT_STATUS_TO_BAR[s.status] ?? 'planning',
            subtitle: `${s.done}/${s.total} tasks`,
          }))}
          timelineStart={timelineStart}
          timelineEnd={timelineEnd}
        />
      )}

      {epics.length > 0 && (
        <Section
          label="Epic"
          rows={epics.map((e) => ({
            id: e.id,
            title: e.title,
            startDate: new Date(e.startDate),
            endDate: new Date(e.endDate),
            progress: e.progress,
            status: EPIC_STATUS_TO_BAR[e.status] ?? 'planning',
            subtitle: `${e.progress}% complete`,
          }))}
          timelineStart={timelineStart}
          timelineEnd={timelineEnd}
        />
      )}
    </div>
  );
}

interface SectionProps {
  label: string;
  rows: Array<{
    id: string;
    title: string;
    subtitle: string;
    startDate: Date;
    endDate: Date;
    progress: number;
    status: string;
  }>;
  timelineStart: Date;
  timelineEnd: Date;
}

function Section({ label, rows, timelineStart, timelineEnd }: SectionProps) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface">
      <div className="flex">
        <div className="w-48 shrink-0 border-r border-border-subtle bg-surface">
          <div className="border-b border-border-default px-4 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-secondary">
              {label}
            </span>
          </div>
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-col justify-center border-b border-border-subtle px-4 last:border-b-0"
              style={{ height: 48 }}
            >
              <span className="truncate text-sm font-medium text-primary">
                {row.title}
              </span>
              <span className="truncate text-xs text-muted">{row.subtitle}</span>
            </div>
          ))}
        </div>

        <div className="relative flex-1 min-w-0">
          <TimelineHeader
            startDate={timelineStart}
            endDate={timelineEnd}
            sprints={rows.map((r) => ({
              _id: r.id,
              name: r.title,
              startDate: r.startDate.toISOString(),
              endDate: r.endDate.toISOString(),
            }))}
          />
          {rows.map((row) => (
            <TimelineRow
              key={row.id}
              title={row.title}
              startDate={row.startDate}
              endDate={row.endDate}
              progress={row.progress}
              timelineStart={timelineStart}
              timelineEnd={timelineEnd}
              status={row.status}
            />
          ))}

          {(() => {
            const today = new Date();
            const totalMs = timelineEnd.getTime() - timelineStart.getTime();
            if (today >= timelineStart && today <= timelineEnd) {
              const todayPct =
                ((today.getTime() - timelineStart.getTime()) / totalMs) * 100;
              return (
                <div
                  className="pointer-events-none absolute top-0 bottom-0 w-px opacity-50"
                  style={{
                    left: `${todayPct}%`,
                    backgroundColor: 'var(--color-accent)',
                  }}
                />
              );
            }
            return null;
          })()}
        </div>
      </div>
    </div>
  );
}
