'use client';

import { useMemo } from 'react';
import { subWeeks, addWeeks, min, max } from 'date-fns';
import { TimelineHeader } from './timeline-header';
import { TimelineRow } from './timeline-row';

interface TimelineChartProps {
  epics: {
    _id: string;
    title: string;
    startDate?: string;
    endDate?: string;
    progress: number;
    status: string;
  }[];
  sprints: {
    _id: string;
    name: string;
    startDate: string;
    endDate: string;
  }[];
  isLoading?: boolean;
}

export function TimelineChart({ epics, sprints, isLoading }: TimelineChartProps) {
  const { timelineStart, timelineEnd } = useMemo(() => {
    const allDates = [
      ...epics.flatMap((e) => [
        e.startDate ? new Date(e.startDate) : null,
        e.endDate ? new Date(e.endDate) : null,
      ]),
      ...sprints.flatMap((s) => [new Date(s.startDate), new Date(s.endDate)]),
    ].filter(Boolean) as Date[];

    if (allDates.length === 0) {
      const now = new Date();
      return { timelineStart: subWeeks(now, 2), timelineEnd: addWeeks(now, 6) };
    }

    return {
      timelineStart: subWeeks(min(allDates), 1),
      timelineEnd: addWeeks(max(allDates), 2),
    };
  }, [epics, sprints]);

  if (isLoading) {
    return (
      <div className="space-y-3 rounded-lg border border-border-subtle bg-surface p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            data-testid="timeline-skeleton"
            className="flex h-12 items-center gap-4"
          >
            <div className="h-4 w-32 animate-pulse rounded bg-subtle" />
            <div className="h-6 flex-1 animate-pulse rounded bg-subtle" />
          </div>
        ))}
      </div>
    );
  }

  const epicRows = epics.filter((e) => e.startDate && e.endDate);

  return (
    <div className="rounded-lg border border-border-subtle bg-surface">
      <div className="flex">
        {/* Left column: epic titles (sticky) */}
        <div className="w-40 shrink-0 border-r border-border-subtle bg-surface">
          <div className="border-b border-border-default px-4 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-secondary">
              Epic
            </span>
          </div>
          {/* Sprint label spacer — match header sprint row height */}
          <div className="h-6 border-b border-border-default" />
          {epicRows.map((epic) => (
            <div
              key={epic._id}
              className="flex items-center border-b border-border-subtle px-4 last:border-b-0"
              style={{ height: 48 }}
            >
              <span className="truncate text-sm font-medium text-primary">
                {epic.title}
              </span>
            </div>
          ))}
        </div>

        {/* Right area: timeline */}
        <div className="relative flex-1 min-w-0">
          <TimelineHeader
            startDate={timelineStart}
            endDate={timelineEnd}
            sprints={sprints}
          />
          {epicRows.map((epic) => (
            <TimelineRow
              key={epic._id}
              title={epic.title}
              startDate={new Date(epic.startDate!)}
              endDate={new Date(epic.endDate!)}
              progress={epic.progress}
              timelineStart={timelineStart}
              timelineEnd={timelineEnd}
              status={epic.status}
            />
          ))}

          {/* Today marker spanning all rows */}
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

      {epicRows.length === 0 && (
        <div className="px-4 py-12 text-center text-secondary">
          No epics with date ranges. Add start/end dates to epics to see them on
          the timeline.
        </div>
      )}
    </div>
  );
}
