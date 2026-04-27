'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { KanbanBoard } from '@/components/features/kanban/kanban-board';
import { KanbanFilterBar, type TaskFilters } from '@/components/features/kanban/kanban-filter-bar';
import { TaskForm } from '@/components/features/tasks/task-form';
import { TaskDetailPanel } from '@/components/features/tasks/task-detail-panel';
import { ActiveSprintBanner } from '@/components/features/sprints/active-sprint-banner';
import { useTasks } from '@/hooks/queries/use-tasks';
import { useSprints } from '@/hooks/queries/use-sprints';
import type { ITask } from '@/modules/tasks/task.types';
import type { ISprint } from '@/modules/sprints/sprint.types';

export default function BoardPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState<TaskFilters>({});
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);

  const { data, isLoading } = useTasks(projectId, filters as Record<string, string>);
  const tasks = data?.tasks ?? [];

  // Deep-link via ?task=<id> (used by mention notifications, my-work, etc.)
  const taskParam = searchParams.get('task');
  useEffect(() => {
    if (!taskParam) return;
    const found = tasks.find((t) => t.id === taskParam);
    if (found && (!selectedTask || selectedTask.id !== found.id)) {
      setSelectedTask(found);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskParam, tasks]);

  const closeDetail = () => {
    setSelectedTask(null);
    if (taskParam) {
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete('task');
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  };

  const { data: sprintsData } = useSprints(projectId);
  const sprints = ((sprintsData?.sprints ?? []) as ISprint[])
    .filter((s) => s.status !== 'closed')
    .map((s) => ({ id: s.id, name: s.name, status: s.status }));

  return (
    <div className="flex h-full flex-col p-0">
      <ActiveSprintBanner
        projectId={projectId}
        onActivate={(sprintId) => {
          const next = { ...filters };
          if (sprintId) next.sprint = sprintId;
          else delete next.sprint;
          setFilters(next);
        }}
        active={filters.sprint}
      />
      <KanbanFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onNewTask={() => setIsTaskFormOpen(true)}
        sprints={sprints}
      />

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <KanbanBoard
            projectId={projectId}
            tasks={tasks}
            isLoading={isLoading}
            onTaskClick={setSelectedTask}
            onAddTask={() => setIsTaskFormOpen(true)}
          />
        </div>

        {selectedTask && (
          <TaskDetailPanel
            taskId={selectedTask.id}
            projectId={projectId}
            onClose={closeDetail}
          />
        )}
      </div>

      <TaskForm
        projectId={projectId}
        open={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
        defaultSprintId={filters.sprint}
      />
    </div>
  );
}
