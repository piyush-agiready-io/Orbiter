'use client';

import { ArrowLeft } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { KanbanBoard } from '@/components/features/tasks/kanban-board';
import { useSprint } from '@/hooks/queries/use-sprints';
import type { ITask } from '@/modules/tasks/task.types';

interface SprintBoardProps {
  sprintId: string;
  projectId: string;
  onBack: () => void;
  onTaskClick: (task: ITask) => void;
}

export function SprintBoard({ sprintId, projectId, onBack, onTaskClick }: SprintBoardProps) {
  const { data: sprint } = useSprint(sprintId);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] px-6 py-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h2 className="text-sm font-semibold text-primary">{sprint?.name}</h2>
          {sprint?.goal && (
            <p className="text-xs text-secondary">{sprint.goal}</p>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-x-auto">
        <KanbanBoard
          projectId={projectId}
          filters={{ sprint: sprintId }}
          onTaskClick={onTaskClick}
        />
      </div>
    </div>
  );
}
