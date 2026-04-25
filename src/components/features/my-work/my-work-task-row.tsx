'use client';

import { useRouter } from 'next/navigation';
import { Lightning, ArrowUp, Minus, ArrowDown } from '@phosphor-icons/react';
import type { ITask, TaskPriority, TaskStatus } from '@/modules/tasks/task.types';

const PRIORITY_ICONS: Record<TaskPriority, React.ReactNode> = {
  P0: <Lightning size={14} weight="fill" className="text-[var(--color-p0)]" />,
  P1: <ArrowUp size={14} weight="bold" className="text-[var(--color-p1)]" />,
  P2: <Minus size={14} className="text-[var(--color-p2)]" />,
  P3: <ArrowDown size={14} className="text-[var(--color-p3)]" />,
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  P0: 'P0',
  P1: 'P1',
  P2: 'P2',
  P3: 'P3',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: 'bg-[var(--color-text-muted)]',
  todo: 'bg-[var(--color-info)]',
  in_progress: 'bg-[var(--color-accent)]',
  review: 'bg-[var(--color-warning)]',
  done: 'bg-[var(--color-success)]',
};

// Populated sprint shape from API
interface PopulatedSprint {
  id: string;
  name: string;
  endDate?: string;
  startDate?: string;
}

// Populated project shape from API
interface PopulatedProject {
  id: string;
  name: string;
  slug?: string;
}

// Extended task with populated references
export interface MyWorkTask extends Omit<ITask, 'project' | 'sprint'> {
  project: string | PopulatedProject;
  sprint?: string | PopulatedSprint;
}

interface MyWorkTaskRowProps {
  task: MyWorkTask;
}

export function MyWorkTaskRow({ task }: MyWorkTaskRowProps) {
  const router = useRouter();

  const projectId =
    typeof task.project === 'string' ? task.project : task.project.id;
  const projectName =
    typeof task.project === 'string' ? '' : task.project.name;
  const sprintName =
    task.sprint && typeof task.sprint !== 'string' ? task.sprint.name : undefined;

  const handleClick = () => {
    router.push(`/projects/${projectId}/board`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className="flex cursor-pointer items-center gap-3 border-b border-subtle py-2.5 px-4 transition-colors duration-[80ms] hover:bg-subtle"
    >
      {/* Priority badge */}
      <span
        className="flex shrink-0 items-center gap-0.5 rounded-sm px-1 py-0.5 text-[11px] font-medium bg-subtle"
        title={`Priority: ${PRIORITY_LABELS[task.priority]}`}
      >
        {PRIORITY_ICONS[task.priority]}
        <span className="ml-0.5">{PRIORITY_LABELS[task.priority]}</span>
      </span>

      {/* Task title */}
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-primary">
        {task.title}
      </p>

      {/* Sprint name */}
      {sprintName && (
        <span className="hidden shrink-0 text-xs text-[var(--color-text-muted)] sm:block">
          {sprintName}
        </span>
      )}

      {/* Project name */}
      {projectName && (
        <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
          {projectName}
        </span>
      )}

      {/* Status dot */}
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${STATUS_COLORS[task.status]}`}
        title={task.status.replace('_', ' ')}
      />
    </div>
  );
}
