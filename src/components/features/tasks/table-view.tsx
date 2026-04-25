'use client';

import { useState } from 'react';
import { Lightning, ArrowUp, Minus, ArrowDown, CaretUpDown } from '@phosphor-icons/react';
import Avatar from 'boring-avatars';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTasks, useUpdateTask } from '@/hooks/queries/use-tasks';
import type { ITask } from '@/modules/tasks/task.types';

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  P0: <Lightning size={14} weight="fill" className="text-[var(--color-p0)]" />,
  P1: <ArrowUp size={14} weight="bold" className="text-[var(--color-p1)]" />,
  P2: <Minus size={14} className="text-[var(--color-p2)]" />,
  P3: <ArrowDown size={14} className="text-[var(--color-p3)]" />,
};

interface TableViewProps {
  projectId: string;
  filters?: Record<string, string>;
  onTaskClick: (task: ITask) => void;
}

export function TableView({ projectId, filters, onTaskClick }: TableViewProps) {
  const [sort, setSort] = useState('-createdAt');
  const { data, isLoading } = useTasks(projectId, { ...filters, sort });
  const updateTask = useUpdateTask(projectId);

  const toggleSort = (field: string) => {
    setSort((prev) => (prev === field ? `-${field}` : prev === `-${field}` ? field : field));
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton h-12 w-full rounded-md" />
        ))}
      </div>
    );
  }

  const tasks = data?.tasks ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border-default)] bg-subtle">
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              <button onClick={() => toggleSort('title')} className="flex items-center gap-1 hover:text-primary interactive-transition">
                Title <CaretUpDown size={12} />
              </button>
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Status</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              <button onClick={() => toggleSort('priority')} className="flex items-center gap-1 hover:text-primary interactive-transition">
                Priority <CaretUpDown size={12} />
              </button>
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Type</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="cursor-pointer border-b border-[var(--color-border-subtle)] bg-surface hover:bg-subtle interactive-transition"
            >
              <td className="px-4 py-2.5 text-sm text-primary">{task.title}</td>
              <td className="px-4 py-2.5">
                <Select
                  value={task.status}
                  onValueChange={(v) => {
                    updateTask.mutate({ taskId: task.id, data: { status: v } });
                  }}
                >
                  <SelectTrigger size="sm" className="w-32" onClick={(e) => e.stopPropagation()}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-1.5">
                  {PRIORITY_ICONS[task.priority]}
                  <span className="text-xs text-secondary">{task.priority}</span>
                </span>
              </td>
              <td className="px-4 py-2.5">
                <Badge variant="secondary" className="text-[11px]">{task.type}</Badge>
              </td>
              <td className="px-4 py-2.5">
                {task.assignee && typeof task.assignee === 'object' ? (
                  <div className="flex items-center gap-2">
                    <Avatar
                      size={20}
                      name={(task.assignee as { name: string }).name}
                      variant="beam"
                      colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#8B8B9A', '#2E7D57']}
                    />
                    <span className="text-sm text-secondary">{(task.assignee as { name: string }).name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-[var(--color-text-muted)]">Unassigned</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tasks.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">No tasks found</p>
        </div>
      )}
    </div>
  );
}
