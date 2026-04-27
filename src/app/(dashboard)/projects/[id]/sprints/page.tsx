'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { SprintList } from '@/components/features/sprints/sprint-list';
import { SprintBoard } from '@/components/features/sprints/sprint-board';
import { SprintCloseDialog } from '@/components/features/sprints/sprint-close-dialog';
import { SprintForm } from '@/components/features/sprints/sprint-form';
import { SprintAiSuggestions } from '@/components/features/sprints/sprint-ai-suggestions';
import { TaskDetailPanel } from '@/components/features/tasks/task-detail-panel';
import type { ITask } from '@/modules/tasks/task.types';

export default function SprintsPage() {
  const params = useParams<{ id: string }>();
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [closingSprintId, setClosingSprintId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);

  if (selectedSprintId) {
    return (
      <>
        <div className="flex h-full">
          <div className="flex-1">
            <SprintBoard
              sprintId={selectedSprintId}
              projectId={params.id}
              onBack={() => setSelectedSprintId(null)}
              onTaskClick={setSelectedTask}
              onClose={setClosingSprintId}
            />
          </div>
          {selectedTask && (
            <TaskDetailPanel
              taskId={selectedTask.id}
              projectId={params.id}
              onClose={() => setSelectedTask(null)}
            />
          )}
        </div>
        {closingSprintId && (
          <SprintCloseDialog
            sprintId={closingSprintId}
            projectId={params.id}
            open={!!closingSprintId}
            onClose={() => setClosingSprintId(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <SprintAiSuggestions projectId={params.id} />
      <SprintList
        projectId={params.id}
        onSelect={setSelectedSprintId}
        onClose={setClosingSprintId}
        onCreate={() => setFormOpen(true)}
      />
      <SprintForm
        projectId={params.id}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
      {closingSprintId && (
        <SprintCloseDialog
          sprintId={closingSprintId}
          projectId={params.id}
          open={!!closingSprintId}
          onClose={() => setClosingSprintId(null)}
        />
      )}
    </>
  );
}
