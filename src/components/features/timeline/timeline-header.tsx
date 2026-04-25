'use client';

import { eachWeekOfInterval, format } from 'date-fns';

interface TimelineHeaderProps {
  startDate: Date;
  endDate: Date;
  sprints: {
    _id: string;
    name: string;
    startDate: string;
    endDate: string;
  }[];
}

export function TimelineHeader({
  startDate,
  endDate,
  sprints,
}: TimelineHeaderProps) {
  const weeks = eachWeekOfInterval(
    { start: startDate, end: endDate },
    { weekStartsOn: 1 },
  );

  const totalMs = endDate.getTime() - startDate.getTime();

  return (
    <div className="relative border-b border-border-default">
      {/* Sprint labels row */}
      <div className="relative h-6 flex items-center">
        {sprints.map((sprint) => {
          const sprintStart = new Date(sprint.startDate);
          const sprintEnd = new Date(sprint.endDate);
          const leftPct =
            ((sprintStart.getTime() - startDate.getTime()) / totalMs) * 100;
          const widthPct =
            ((sprintEnd.getTime() - sprintStart.getTime()) / totalMs) * 100;

          return (
            <span
              key={`label-${sprint._id}`}
              className="absolute flex items-center justify-center text-xs font-medium text-primary truncate px-1"
              style={{
                left: `${Math.max(0, leftPct)}%`,
                width: `${widthPct}%`,
              }}
            >
              {sprint.name}
            </span>
          );
        })}
      </div>

      {/* Week labels */}
      <div className="flex">
        {weeks.map((week, i) => (
          <div
            key={i}
            className="flex-1 border-r border-border-subtle px-2 py-1.5 text-center last:border-r-0"
          >
            <span className="text-xs text-secondary">
              {format(week, 'MMM d')}
            </span>
          </div>
        ))}
      </div>

      {/* Sprint boundary markers */}
      {sprints.map((sprint) => {
        const sprintStart = new Date(sprint.startDate);
        const sprintEnd = new Date(sprint.endDate);
        const leftPct =
          ((sprintStart.getTime() - startDate.getTime()) / totalMs) * 100;
        const rightPct =
          ((sprintEnd.getTime() - startDate.getTime()) / totalMs) * 100;

        return (
          <div key={sprint._id}>
            {/* Start boundary */}
            <div
              className="absolute top-0 bottom-0 w-px border-l border-dashed border-accent/40"
              style={{ left: `${leftPct}%` }}
            />
            {/* End boundary */}
            <div
              className="absolute top-0 bottom-0 w-px border-l border-dashed border-accent/40"
              style={{ left: `${rightPct}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}
