'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { DataTable, type Column } from '@/components/shared/data-table';
import { BulkActionsBar } from '@/components/features/table/bulk-actions-bar';
import { TaskDetailPanel } from '@/components/features/tasks/task-detail-panel';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTasks, useBulkUpdateTasks, useDeleteTask } from '@/hooks/queries/use-tasks';
import type { ITask } from '@/modules/tasks/task.types';

const PRIORITY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  P0: 'destructive',
  P1: 'default',
  P2: 'secondary',
  P3: 'outline',
};

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export default function TablePage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const [sortKey, setSortKey] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useTasks(projectId);
  const tasks = data?.tasks ?? [];

  const bulkUpdate = useBulkUpdateTasks(projectId);
  const deleteTask = useDeleteTask(projectId);

  const columns: Column<ITask>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (task) => (
        <span className="font-medium text-primary">{task.title}</span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      width: '100px',
      render: (task) => (
        <Badge variant={PRIORITY_VARIANT[task.priority] ?? 'secondary'}>
          {task.priority}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (task) => (
        <Badge variant="secondary">
          {STATUS_LABELS[task.status] ?? task.status}
        </Badge>
      ),
    },
    {
      key: 'assignees',
      header: 'Assignees',
      width: '140px',
      render: (task) => {
        if (!task.assignees || task.assignees.length === 0) return <span className="text-sm text-muted">Unassigned</span>;
        const first = task.assignees[0] as unknown as { name?: string } | string;
        const name = typeof first === 'object' && first?.name ? first.name : 'Assigned';
        return (
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="truncate text-sm text-secondary">
              {name}{task.assignees.length > 1 ? ` +${task.assignees.length - 1}` : ''}
            </span>
          </div>
        );
      },
    },
    {
      key: 'sprint',
      header: 'Sprint',
      width: '120px',
      render: (task) => {
        if (!task.sprint) return <span className="text-sm text-muted">—</span>;
        const sprint = task.sprint as unknown as { name?: string } | string;
        const name = typeof sprint === 'object' && sprint?.name ? sprint.name : '—';
        return <span className="text-sm text-secondary">{name}</span>;
      },
    },
    {
      key: 'createdAt',
      header: 'Created',
      width: '120px',
      sortable: true,
      render: (task) => (
        <span className="text-sm text-muted">
          {format(new Date(task.createdAt), 'MMM d, yyyy')}
        </span>
      ),
    },
  ];

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const aVal = (a as unknown as Record<string, unknown>)[sortKey];
    const bVal = (b as unknown as Record<string, unknown>)[sortKey];
    const aStr = aVal instanceof Date ? aVal.getTime() : String(aVal ?? '');
    const bStr = bVal instanceof Date ? bVal.getTime() : String(bVal ?? '');
    if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
    if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleBulkStatusChange = (status: string | null) => {
    if (!status) return;
    const taskIds = Array.from(selectedIds);
    bulkUpdate.mutate(
      { taskIds, update: { status } },
      { onSuccess: () => setSelectedIds(new Set()) },
    );
  };

  const handleBulkDelete = () => {
    const taskIds = Array.from(selectedIds);
    Promise.all(taskIds.map((id) => deleteTask.mutateAsync(id))).then(() => {
      setSelectedIds(new Set());
    });
  };

  return (
    <div className="flex h-full p-0">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <DataTable<ITask>
            columns={columns}
            data={sortedTasks}
            isLoading={isLoading}
            getRowId={(task) => (task as unknown as { id?: string; _id?: string }).id ?? (task as unknown as { _id: string })._id}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={setSelectedTask}
            onSort={handleSort}
            sortKey={sortKey}
            sortDirection={sortDirection}
            emptyMessage="No tasks yet. Create your first task from the board view."
          />
        </div>
      </div>

      {selectedTask && (
        <TaskDetailPanel
          taskId={selectedTask.id}
          projectId={projectId}
          onClose={() => setSelectedTask(null)}
        />
      )}

      <BulkActionsBar
        selectedCount={selectedIds.size}
        onStatusChange={handleBulkStatusChange}
        onDelete={handleBulkDelete}
      />
    </div>
  );
}
