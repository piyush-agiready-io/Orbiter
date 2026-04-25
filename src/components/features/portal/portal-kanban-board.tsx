'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ITask, TaskStatus } from '@/modules/tasks/task.types';

/**
 * Maps the 5 internal statuses to 3 client-facing columns:
 *   backlog + todo     => Planned
 *   in_progress + review => Working On
 *   done               => Completed
 */
type PortalColumn = 'planned' | 'working_on' | 'completed';

const STATUS_TO_COLUMN: Record<TaskStatus, PortalColumn> = {
  backlog: 'planned',
  todo: 'planned',
  in_progress: 'working_on',
  review: 'working_on',
  done: 'completed',
};

const COLUMNS: { id: PortalColumn; title: string }[] = [
  { id: 'planned', title: 'Planned' },
  { id: 'working_on', title: 'Working On' },
  { id: 'completed', title: 'Completed' },
];

const TYPE_LABELS: Record<string, { label: string; className: string }> = {
  feature: { label: 'Feature', className: 'bg-accent-muted text-[var(--color-accent-text)]' },
  chore: { label: 'Chore', className: 'bg-subtle text-secondary' },
  improvement: { label: 'Improvement', className: 'bg-[var(--color-info-muted)] text-[var(--color-info)]' },
};

interface PortalKanbanBoardProps {
  tasks: ITask[];
  isLoading?: boolean;
}

export function PortalKanbanBoard({ tasks, isLoading = false }: PortalKanbanBoardProps) {
  const columnData = useMemo(() => {
    return COLUMNS.map((col) => ({
      ...col,
      tasks: tasks
        .filter((t) => STATUS_TO_COLUMN[t.status] === col.id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }));
  }, [tasks]);

  return (
    <div className="flex gap-4 overflow-x-auto px-6 py-5">
      {columnData.map((col) => (
        <div
          key={col.id}
          className="flex min-h-[200px] w-[300px] shrink-0 flex-col rounded-lg bg-subtle/50"
        >
          {/* Column header */}
          <div className="flex items-center gap-2 px-3 py-2.5">
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              {col.title}
            </h3>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-subtle px-1.5 text-[11px] font-medium text-secondary">
              {col.tasks.length}
            </span>
          </div>

          {/* Cards */}
          <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-subtle" />
                ))
              : col.tasks.length > 0
                ? col.tasks.map((task) => (
                    <PortalTaskCard key={task.id} task={task} />
                  ))
                : (
                    <p className="py-8 text-center text-xs text-[var(--color-text-disabled)]">
                      No tasks
                    </p>
                  )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Simplified task card for portal: title + type badge only */
function PortalTaskCard({ task }: { task: ITask }) {
  const typeConfig = TYPE_LABELS[task.type];

  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--color-border-subtle)] bg-surface shadow-xs',
        'px-3 py-2.5',
      )}
    >
      <p className="text-[13px] font-medium leading-snug text-primary line-clamp-2">
        {task.title}
      </p>
      {typeConfig && (
        <span
          className={cn(
            'mt-1.5 inline-block rounded-sm px-1.5 py-0.5 text-xs font-medium',
            typeConfig.className,
          )}
        >
          {typeConfig.label}
        </span>
      )}
    </div>
  );
}
