'use client';

import { format } from 'date-fns';
import { useState } from 'react';

interface TimelineRowProps {
  title: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  timelineStart: Date;
  timelineEnd: Date;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'var(--color-info)',
  active: 'var(--color-accent)',
  done: 'var(--color-success)',
};

export function TimelineRow({
  title,
  startDate,
  endDate,
  progress,
  timelineStart,
  timelineEnd,
  status,
}: TimelineRowProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const totalMs = timelineEnd.getTime() - timelineStart.getTime();
  const leftPct = Math.max(
    0,
    ((startDate.getTime() - timelineStart.getTime()) / totalMs) * 100,
  );
  const widthPct = Math.min(
    100 - leftPct,
    ((endDate.getTime() - startDate.getTime()) / totalMs) * 100,
  );

  const barColor = STATUS_COLORS[status] ?? STATUS_COLORS.planning;

  return (
    <div
      className="relative flex items-center border-b border-border-subtle"
      style={{ height: 48 }}
    >
      {/* Bar area */}
      <div className="relative h-6 w-full px-1">
        {/* Background bar (track) */}
        <div
          className="absolute top-0 h-full rounded-sm opacity-20"
          style={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            backgroundColor: barColor,
          }}
        />
        {/* Progress fill */}
        <div
          className="absolute top-0 h-full rounded-sm"
          style={{
            left: `${leftPct}%`,
            width: `${widthPct * (progress / 100)}%`,
            backgroundColor: barColor,
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        />
        {/* Progress label — centered on the track */}
        {widthPct > 3 && (
          <span
            className="absolute top-0 flex h-full items-center justify-center text-xs font-semibold text-inverse pointer-events-none"
            style={{
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            {progress}%
          </span>
        )}

        {/* Tooltip */}
        {showTooltip && (
          <div
            className="absolute -top-16 z-20 rounded-md border border-border-default bg-elevated px-3 py-2 text-xs shadow-md"
            style={{ left: `${leftPct}%` }}
          >
            <p className="font-medium text-primary">{title}</p>
            <p className="text-secondary">
              {format(startDate, 'MMM d, yyyy')} &ndash;{' '}
              {format(endDate, 'MMM d, yyyy')}
            </p>
            <p className="text-muted">Progress: {progress}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
