'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './kanban-column';
import { TaskCard } from './task-card';
import { useTasks, useUpdateTaskStatus } from '@/hooks/queries/use-tasks';
import type { ITask, TaskStatus } from '@/modules/tasks/task.types';
import { TASK_STATUSES } from '@/modules/tasks/task.types';

interface KanbanBoardProps {
  projectId: string;
  filters?: Record<string, string>;
  onTaskClick: (task: ITask) => void;
  onAddTask?: (status: TaskStatus) => void;
}

export function KanbanBoard({ projectId, filters, onTaskClick, onAddTask }: KanbanBoardProps) {
  const { data, isLoading } = useTasks(projectId, { ...filters, limit: '200', sort: 'order' });
  const updateStatus = useUpdateTaskStatus(projectId);
  const [activeTask, setActiveTask] = useState<ITask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columns = useMemo(() => {
    const tasks = data?.tasks ?? [];
    const grouped: Record<TaskStatus, ITask[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const task of tasks) {
      grouped[task.status]?.push(task);
    }
    return grouped;
  }, [data?.tasks]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = data?.tasks.find((t) => t.id === event.active.id);
      if (task) setActiveTask(task);
    },
    [data?.tasks],
  );

  const handleDragOver = useCallback((_event: DragOverEvent) => {}, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null);
      const { active, over } = event;
      if (!over) return;

      const taskId = active.id as string;
      const newStatus = (over.id as string) in columns
        ? (over.id as TaskStatus)
        : data?.tasks.find((t) => t.id === over.id)?.status;

      if (!newStatus) return;

      const task = data?.tasks.find((t) => t.id === taskId);
      if (task && task.status !== newStatus) {
        updateStatus.mutate({ taskId, status: newStatus });
      }
    },
    [columns, data?.tasks, updateStatus],
  );

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto p-6">
        {TASK_STATUSES.map((status) => (
          <div key={status} className="w-72 flex-shrink-0">
            <div className="skeleton h-4 w-20 rounded-sm mb-3" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-20 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto p-6">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={columns[status]}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask ? () => onAddTask(status) : undefined}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="rotate-[2deg] scale-[1.02]">
            <TaskCard task={activeTask} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
