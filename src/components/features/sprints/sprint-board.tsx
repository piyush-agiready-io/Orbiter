'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, ListPlus, Play, CheckCircle, Timer } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KanbanBoard } from '@/components/features/kanban/kanban-board';
import { TaskForm } from '@/components/features/tasks/task-form';
import { SprintTaskPicker } from './sprint-task-picker';
import { useSprint, useUpdateSprint } from '@/hooks/queries/use-sprints';
import { useTasks } from '@/hooks/queries/use-tasks';
import type { ITask } from '@/modules/tasks/task.types';

interface SprintBoardProps {
  sprintId: string;
  projectId: string;
  onBack: () => void;
  onTaskClick: (task: ITask) => void;
  onClose: (sprintId: string) => void;
}

const STATUS_BADGE: Record<string, { icon: React.ReactNode; style: string; label: string }> = {
  planning: {
    icon: <Timer size={12} />,
    style: 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]',
    label: 'Planning',
  },
  active: {
    icon: <Play size={12} weight="fill" />,
    style: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]',
    label: 'Active',
  },
  closed: {
    icon: <CheckCircle size={12} weight="fill" />,
    style: 'bg-[var(--color-success-muted)] text-[var(--color-success)]',
    label: 'Closed',
  },
};

export function SprintBoard({
  sprintId,
  projectId,
  onBack,
  onTaskClick,
  onClose,
}: SprintBoardProps) {
  const { data: sprint } = useSprint(sprintId);
  const { data: tasksData, isLoading } = useTasks(projectId, {
    sprint: sprintId,
    limit: '200',
  });
  const updateSprint = useUpdateSprint(projectId);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const tasks = (tasksData?.tasks ?? []) as ITask[];
  const status = sprint?.status ?? 'planning';
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.planning;

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const isClosed = status === 'closed';

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--color-border-subtle)] px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft size={16} />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-primary truncate">
                  {sprint?.name ?? 'Sprint'}
                </h2>
                <Badge className={badge.style}>
                  <span className="mr-1">{badge.icon}</span>
                  {badge.label}
                </Badge>
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-secondary">
                {sprint?.goal && <span className="truncate">{sprint.goal}</span>}
                {sprint?.startDate && sprint?.endDate && (
                  <span className="shrink-0 text-muted">
                    {format(new Date(sprint.startDate), 'MMM d')} –{' '}
                    {format(new Date(sprint.endDate), 'MMM d, yyyy')}
                  </span>
                )}
                <span className="shrink-0 text-muted">
                  {doneCount}/{tasks.length} done
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!isClosed && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
                  <ListPlus size={14} className="mr-1" />
                  Add Tasks
                </Button>
                <Button size="sm" onClick={() => setTaskFormOpen(true)}>
                  <Plus size={14} className="mr-1" />
                  New Task
                </Button>
              </>
            )}
            {status === 'planning' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  updateSprint.mutate({ sprintId, data: { status: 'active' } })
                }
                disabled={updateSprint.isPending}
              >
                <Play size={14} weight="fill" className="mr-1" />
                Start Sprint
              </Button>
            )}
            {status === 'active' && (
              <Button size="sm" variant="ghost" onClick={() => onClose(sprintId)}>
                Close Sprint
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <KanbanBoard
          projectId={projectId}
          tasks={tasks}
          isLoading={isLoading}
          onTaskClick={onTaskClick}
          onAddTask={() => setTaskFormOpen(true)}
        />
      </div>

      <TaskForm
        projectId={projectId}
        open={taskFormOpen}
        onClose={() => setTaskFormOpen(false)}
        defaultSprintId={sprintId}
      />
      <SprintTaskPicker
        projectId={projectId}
        sprintId={sprintId}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
