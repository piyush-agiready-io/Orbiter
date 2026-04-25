'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { TableView } from '@/components/features/tasks/table-view';
import { TaskDetailPanel } from '@/components/features/tasks/task-detail-panel';
import type { ITask } from '@/modules/tasks/task.types';

export default function BacklogPage() {
  const params = useParams<{ id: string }>();
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const defaultFilters = { status: 'backlog' };

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-[var(--color-border-subtle)] px-6 py-3">
          <h2 className="text-sm font-semibold text-primary">Backlog</h2>
        </div>
        <div className="flex-1 overflow-auto">
          <TableView
            projectId={params.id}
            filters={defaultFilters}
            onTaskClick={setSelectedTask}
          />
        </div>
      </div>

      {selectedTask && (
        <TaskDetailPanel
          taskId={selectedTask.id}
          projectId={params.id}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
