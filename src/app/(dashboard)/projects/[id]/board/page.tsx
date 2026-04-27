'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { KanbanBoard } from '@/components/features/kanban/kanban-board';
import { KanbanFilterBar, type TaskFilters } from '@/components/features/kanban/kanban-filter-bar';
import { TaskForm } from '@/components/features/tasks/task-form';
import { TaskDetailPanel } from '@/components/features/tasks/task-detail-panel';
import { ActiveSprintBanner } from '@/components/features/sprints/active-sprint-banner';
import { useTasks } from '@/hooks/queries/use-tasks';
import type { ITask } from '@/modules/tasks/task.types';

export default function BoardPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [filters, setFilters] = useState<TaskFilters>({});
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);

  const { data, isLoading } = useTasks(projectId, filters as Record<string, string>);
  const tasks = data?.tasks ?? [];

  return (
    <div className="flex h-full flex-col p-0">
      <ActiveSprintBanner projectId={projectId} />
      <KanbanFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onNewTask={() => setIsTaskFormOpen(true)}
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
            onClose={() => setSelectedTask(null)}
          />
        )}
      </div>

      <TaskForm
        projectId={projectId}
        open={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
      />
    </div>
  );
}
