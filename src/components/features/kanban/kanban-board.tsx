'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { api } from '@/shared/lib/api-client';
import type { ITask, TaskStatus } from '@/modules/tasks/task.types';

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'Todo' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

interface KanbanBoardProps {
  projectId: string;
  tasks: ITask[];
  isLoading?: boolean;
  onTaskClick?: (task: ITask) => void;
  onAddTask?: (status: string) => void;
}

export function KanbanBoard({
  projectId,
  tasks,
  isLoading = false,
  onTaskClick,
  onAddTask,
}: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<ITask | null>(null);
  const [localTasks, setLocalTasks] = useState<ITask[]>(tasks);

  // Sync local state when tasks prop changes (e.g. after refetch)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: syncing prop to local state for optimistic DnD updates
  useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const getColumnTasks = useCallback(
    (columnId: string) =>
      localTasks
        .filter((t) => t.status === columnId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [localTasks],
  );

  // Memoize columns data to avoid recalculating on every render
  const columnData = useMemo(
    () =>
      COLUMNS.map((col) => ({
        ...col,
        tasks: getColumnTasks(col.id),
      })),
    [getColumnTasks],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = localTasks.find((t) => t.id === event.active.id);
      setActiveTask(task ?? null);
    },
    [localTasks],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeTaskData = localTasks.find((t) => t.id === activeId);
      if (!activeTaskData) return;

      // Determine target column: if over item is a task, use its status; otherwise overId is a column id
      const overTask = localTasks.find((t) => t.id === overId);
      const targetColumn = overTask ? overTask.status : overId;

      if (activeTaskData.status !== targetColumn) {
        setLocalTasks((prev) =>
          prev.map((t) =>
            t.id === activeId
              ? { ...t, status: targetColumn as TaskStatus }
              : t,
          ),
        );
      }
    },
    [localTasks],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeTaskData = localTasks.find((t) => t.id === activeId);
      if (!activeTaskData) return;

      // Determine target column
      const overTask = localTasks.find((t) => t.id === overId);
      const targetColumn = (overTask ? overTask.status : overId) as TaskStatus;

      // Get tasks in the target column, sorted by order
      const columnTasks = localTasks
        .filter((t) => t.status === targetColumn)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
      const newIndex = columnTasks.findIndex((t) => t.id === overId);

      let finalOrder: number;

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        // Reorder within column
        const reordered = arrayMove(columnTasks, oldIndex, newIndex);
        finalOrder = newIndex;

        setLocalTasks((prev) => {
          const others = prev.filter((t) => t.status !== targetColumn);
          return [
            ...others,
            ...reordered.map((t, i) => ({ ...t, order: i })),
          ];
        });
      } else {
        // Moved to a new column or dropped in same position
        finalOrder = newIndex !== -1 ? newIndex : columnTasks.length - 1;
      }

      // Snapshot for rollback
      const snapshot = localTasks;

      // Fire API call in background — optimistic update already applied
      api
        .patch(`/tasks/${activeId}/reorder`, {
          status: targetColumn,
          order: Math.max(0, finalOrder),
        })
        .then(() => {
          // Invalidate to get fresh data from server
          queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
        })
        .catch(() => {
          // Revert on error
          setLocalTasks(snapshot);
        });
    },
    [localTasks, projectId, queryClient],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-3 px-5 py-4">
        {columnData.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            tasks={col.tasks}
            isLoading={isLoading}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
          />
        ))}
      </div>

      {/* Drag overlay — renders a ghost card following the cursor */}
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-[2deg]">
            <KanbanCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
