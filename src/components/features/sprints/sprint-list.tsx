'use client';

import { useState } from 'react';
import {
  Timer,
  Play,
  CheckCircle,
  Plus,
  ListPlus,
  CaretDown,
  CaretRight,
  Trash,
} from '@phosphor-icons/react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSprints, useUpdateSprint } from '@/hooks/queries/use-sprints';
import { useTasks, useUpdateTask } from '@/hooks/queries/use-tasks';
import { InfoTip } from '@/components/shared/info-tip';
import { TaskForm } from '@/components/features/tasks/task-form';
import { SprintTaskPicker } from './sprint-task-picker';
import type { ITask } from '@/modules/tasks/task.types';
import type { ISprint } from '@/modules/sprints/sprint.types';

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; style: string }> = {
  planning: {
    icon: <Timer size={14} />,
    style: 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]',
  },
  active: {
    icon: <Play size={14} weight="fill" />,
    style: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]',
  },
  closed: {
    icon: <CheckCircle size={14} weight="fill" />,
    style: 'bg-[var(--color-success-muted)] text-[var(--color-success)]',
  },
};

const PRIORITY_TINT: Record<string, string> = {
  P0: 'bg-[var(--color-error-muted)] text-[var(--color-error)]',
  P1: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
  P2: 'bg-[var(--color-info-muted)] text-[var(--color-info)]',
  P3: 'bg-subtle text-secondary',
};

const STATUS_LABEL: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

interface SprintListProps {
  projectId: string;
  onClose: (sprintId: string) => void;
  onCreate: () => void;
}

export function SprintList({ projectId, onClose, onCreate }: SprintListProps) {
  const { data, isLoading } = useSprints(projectId);
  const updateSprint = useUpdateSprint(projectId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--color-border-subtle)] bg-surface p-4 space-y-3"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </div>
    );
  }

  const sprints = data?.sprints ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-primary">Sprints</h2>
          <InfoTip text="A sprint is a time-boxed iteration. Click a sprint to manage its tasks. Only one sprint can be active per project." />
        </div>
        <Button size="sm" onClick={onCreate}>
          <Plus size={16} className="mr-1" /> New Sprint
        </Button>
      </div>

      {sprints.length === 0 ? (
        <div className="py-12 text-center">
          <Timer size={32} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-muted)]">No sprints yet</p>
          <Button size="sm" variant="ghost" className="mt-2" onClick={onCreate}>
            Create your first sprint
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sprints.map((sprint) => (
            <SprintCard
              key={sprint.id}
              sprint={sprint as ISprint}
              projectId={projectId}
              expanded={expandedId === sprint.id}
              onToggle={() =>
                setExpandedId(expandedId === sprint.id ? null : sprint.id)
              }
              onActivate={() =>
                updateSprint.mutate(
                  { sprintId: sprint.id, data: { status: 'active' } },
                  {
                    onError: (err: unknown) =>
                      toast.error(
                        (err as { message?: string })?.message ??
                          'Could not start sprint',
                      ),
                  },
                )
              }
              onClose={() => onClose(sprint.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SprintCardProps {
  sprint: ISprint;
  projectId: string;
  expanded: boolean;
  onToggle: () => void;
  onActivate: () => void;
  onClose: () => void;
}

function SprintCard({
  sprint,
  projectId,
  expanded,
  onToggle,
  onActivate,
  onClose,
}: SprintCardProps) {
  const config = STATUS_CONFIG[sprint.status];
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: tasksData, isLoading: tasksLoading } = useTasks(
    projectId,
    { sprint: sprint.id, limit: '200' },
    { enabled: expanded },
  );
  const updateTask = useUpdateTask(projectId);
  const tasks = (tasksData?.tasks ?? []) as ITask[];
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const isClosed = sprint.status === 'closed';
  // Loading is true on first expansion. Once we've fetched once, treat
  // "no tasks" as authoritative even while a refetch is in flight, so
  // the empty state doesn't flicker after task creation invalidations.
  const showSkeleton = expanded && tasksLoading && !tasksData;

  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 min-w-0 items-center gap-2 text-left"
        >
          {expanded ? (
            <CaretDown size={14} className="shrink-0 text-secondary" />
          ) : (
            <CaretRight size={14} className="shrink-0 text-secondary" />
          )}
          <h3 className="text-sm font-semibold text-primary truncate">
            {sprint.name}
          </h3>
          <Badge className={config.style}>
            <span className="mr-1">{config.icon}</span>
            {sprint.status}
          </Badge>
          {sprint.goal && (
            <span className="hidden text-xs text-secondary truncate sm:inline">
              — {sprint.goal}
            </span>
          )}
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted whitespace-nowrap">
            {format(new Date(sprint.startDate), 'MMM d')} –{' '}
            {format(new Date(sprint.endDate), 'MMM d')}
          </span>
          {sprint.status === 'planning' && (
            <Button size="sm" onClick={onActivate}>
              <Play size={14} weight="fill" className="mr-1" />
              Start
            </Button>
          )}
          {sprint.status === 'active' && (
            <Button size="sm" variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}
          {sprint.status === 'closed' && (
            <span className="text-xs text-muted">
              Velocity {sprint.velocity?.completed ?? 0}/
              {sprint.velocity?.planned ?? 0}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-subtle px-4 py-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              {showSkeleton
                ? 'Loading tasks…'
                : tasks.length === 0
                  ? 'No tasks yet'
                  : `${doneCount}/${tasks.length} done`}
            </span>
            {!isClosed && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                >
                  <ListPlus size={14} className="mr-1" />
                  Add Tasks
                </Button>
                <Button size="sm" onClick={() => setTaskFormOpen(true)}>
                  <Plus size={14} className="mr-1" />
                  New Task
                </Button>
              </div>
            )}
          </div>

          {showSkeleton ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              {isClosed
                ? 'This sprint had no tasks.'
                : 'Add tasks from your backlog or create new ones for this sprint.'}
            </p>
          ) : (
            <ul className="divide-y divide-subtle">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="group flex items-center gap-3 py-2"
                >
                  <Badge className={`shrink-0 ${PRIORITY_TINT[task.priority] ?? ''}`}>
                    {task.priority}
                  </Badge>
                  <span className="flex-1 text-sm text-primary truncate">
                    {task.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {STATUS_LABEL[task.status] ?? task.status}
                  </span>
                  {!isClosed && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-[var(--color-error)] opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() =>
                        updateTask.mutate(
                          { taskId: task.id, data: { sprintId: null } },
                          {
                            onSuccess: () => toast.success('Removed from sprint'),
                          },
                        )
                      }
                      title="Remove from sprint"
                      disabled={updateTask.isPending}
                    >
                      <Trash size={14} />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <TaskForm
        projectId={projectId}
        open={taskFormOpen}
        onClose={() => setTaskFormOpen(false)}
        defaultSprintId={sprint.id}
      />
      <SprintTaskPicker
        projectId={projectId}
        sprintId={sprint.id}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
