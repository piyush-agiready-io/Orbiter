'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { KanbanCard } from './kanban-card';
import { KanbanCardSkeleton } from './kanban-card-skeleton';
import type { ITask } from '@/modules/tasks/task.types';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: ITask[];
  isLoading?: boolean;
  onTaskClick?: (task: ITask) => void;
  onAddTask?: (status: string) => void;
}

export function KanbanColumn({
  id,
  title,
  tasks,
  isLoading = false,
  onTaskClick,
  onAddTask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={cn(
        'flex min-h-[200px] flex-1 flex-col rounded-lg bg-subtle/50 transition-colors duration-[120ms]',
        isOver && 'border border-[var(--color-accent)]/30 bg-[var(--color-accent-muted)]/30',
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            {title}
          </h3>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-subtle px-1.5 text-[11px] font-medium text-secondary">
            {tasks.length}
          </span>
        </div>
        {onAddTask && (
          <button
            onClick={() => onAddTask(id)}
            className="rounded-md p-1 text-[var(--color-text-muted)] transition-colors duration-[120ms] hover:bg-subtle hover:text-primary"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2 px-2 pb-2">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <KanbanCardSkeleton key={i} />
              ))
            : tasks.length > 0
              ? tasks.map((task) => (
                  <KanbanCard key={task.id} task={task} onClick={onTaskClick} />
                ))
              : (
                  <p className="py-8 text-center text-xs text-[var(--color-text-disabled)]">
                    Drag tasks here
                  </p>
                )}
        </SortableContext>
      </div>
    </div>
  );
}
