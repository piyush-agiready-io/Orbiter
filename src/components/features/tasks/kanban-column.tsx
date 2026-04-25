'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { TaskCard } from './task-card';
import type { ITask, TaskStatus } from '@/modules/tasks/task.types';

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: 'bg-[var(--color-bg-muted)]',
  todo: 'bg-[var(--color-info-muted)]',
  in_progress: 'bg-[var(--color-accent-muted)]',
  review: 'bg-[var(--color-warning-muted)]',
  done: 'bg-[var(--color-success-muted)]',
};

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: ITask[];
  onTaskClick: (task: ITask) => void;
  onAddTask?: () => void;
}

export function KanbanColumn({ status, tasks, onTaskClick, onAddTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 flex-shrink-0 flex-col">
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <div className={cn('h-2 w-2 rounded-full', STATUS_COLORS[status])} />
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            {STATUS_LABELS[status]}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">{tasks.length}</span>
        </div>
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-subtle hover:text-primary interactive-transition"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-1 flex-col gap-2 rounded-lg p-1 transition-colors duration-150',
          isOver && 'bg-[var(--color-accent-muted)]',
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
