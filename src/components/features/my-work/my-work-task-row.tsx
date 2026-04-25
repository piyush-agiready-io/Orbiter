'use client';

import { useRouter } from 'next/navigation';
import { Lightning, ArrowUp, Minus, ArrowDown } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/shared/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ITask, TaskPriority, TaskStatus } from '@/modules/tasks/task.types';

const PRIORITY_ICONS: Record<TaskPriority, React.ReactNode> = {
  P0: <Lightning size={14} weight="fill" className="text-[var(--color-p0)]" />,
  P1: <ArrowUp size={14} weight="bold" className="text-[var(--color-p1)]" />,
  P2: <Minus size={14} className="text-[var(--color-p2)]" />,
  P3: <ArrowDown size={14} className="text-[var(--color-p3)]" />,
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; style: string }> = {
  backlog: { label: 'Backlog', style: 'bg-subtle text-secondary' },
  todo: { label: 'Todo', style: 'bg-[var(--color-info-muted)] text-[var(--color-info)]' },
  in_progress: { label: 'In Progress', style: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]' },
  review: { label: 'Review', style: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]' },
  done: { label: 'Done', style: 'bg-[var(--color-success-muted)] text-[var(--color-success)]' },
};

interface PopulatedSprint {
  id: string;
  name: string;
  endDate?: string;
  startDate?: string;
}

interface PopulatedProject {
  id: string;
  name: string;
  slug?: string;
}

export interface MyWorkTask extends Omit<ITask, 'project' | 'sprint'> {
  project: string | PopulatedProject;
  sprint?: string | PopulatedSprint;
}

interface MyWorkTaskRowProps {
  task: MyWorkTask;
}

export function MyWorkTaskRow({ task }: MyWorkTaskRowProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const projectId = typeof task.project === 'string' ? task.project : task.project.id;
  const projectName = typeof task.project === 'string' ? '' : task.project.name;
  const sprintName = task.sprint && typeof task.sprint !== 'string' ? task.sprint.name : undefined;
  const statusConfig = STATUS_CONFIG[task.status];

  const handleStatusChange = async (newStatus: string | null) => {
    if (!newStatus || newStatus === task.status) return;
    try {
      await api.patch(`/tasks/${task.id}/status`, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus as TaskStatus]?.label}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="flex items-center gap-3 border-b border-subtle py-2.5 px-4 transition-colors duration-[80ms] hover:bg-subtle">
      {/* Priority badge */}
      <span className="flex shrink-0 items-center gap-0.5 rounded-sm px-1 py-0.5 text-[11px] font-medium bg-subtle">
        {PRIORITY_ICONS[task.priority]}
        <span className="ml-0.5">{task.priority}</span>
      </span>

      {/* Task title — clickable */}
      <button
        type="button"
        onClick={() => router.push(`/projects/${projectId}/board`)}
        className="min-w-0 flex-1 truncate text-left text-sm font-medium text-primary hover:text-accent transition-colors"
      >
        {task.title}
      </button>

      {/* Sprint name */}
      {sprintName && (
        <span className="hidden shrink-0 text-xs text-[var(--color-text-muted)] sm:block">
          {sprintName}
        </span>
      )}

      {/* Project name */}
      {projectName && (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {projectName}
        </Badge>
      )}

      {/* Status selector */}
      <Select value={task.status} onValueChange={handleStatusChange}>
        <SelectTrigger className={`h-6 w-auto gap-1 border-0 px-2 text-xs font-medium ${statusConfig.style}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="backlog">Backlog</SelectItem>
          <SelectItem value="todo">Todo</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="review">Review</SelectItem>
          <SelectItem value="done">Done</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
