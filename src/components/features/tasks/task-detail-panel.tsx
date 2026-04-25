'use client';

import { X } from '@phosphor-icons/react';
import Avatar from 'boring-avatars';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTask, useUpdateTask } from '@/hooks/queries/use-tasks';
import { format } from 'date-fns';
import { CommentList } from '@/components/features/comments/comment-list';
import { CommentInput } from '@/components/features/comments/comment-input';

interface TaskDetailPanelProps {
  taskId: string;
  projectId: string;
  onClose: () => void;
}

export function TaskDetailPanel({ taskId, projectId, onClose }: TaskDetailPanelProps) {
  const { data: task, isLoading } = useTask(taskId);
  const updateTask = useUpdateTask(projectId);

  const handleUpdate = (data: Record<string, unknown>) => {
    updateTask.mutate({ taskId, data });
  };

  if (isLoading || !task) {
    return (
      <div className="w-96 border-l border-[var(--color-border-subtle)] bg-surface p-6">
        <div className="space-y-4">
          <div className="skeleton h-6 w-3/4 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
          <div className="skeleton h-20 w-full rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 border-l border-[var(--color-border-subtle)] bg-surface overflow-y-auto">
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-3">
        <h3 className="text-sm font-semibold text-primary">Task Details</h3>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-subtle hover:text-primary interactive-transition"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-4 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-primary leading-snug">{task.title}</h2>
          {task.description && (
            <p className="mt-2 text-sm text-secondary leading-relaxed">{task.description}</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Status</span>
            <Select value={task.status} onValueChange={(v) => handleUpdate({ status: v })}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Priority</span>
            <Select value={task.priority} onValueChange={(v) => handleUpdate({ priority: v })}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="P0">P0 — Urgent</SelectItem>
                <SelectItem value="P1">P1 — High</SelectItem>
                <SelectItem value="P2">P2 — Medium</SelectItem>
                <SelectItem value="P3">P3 — Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Type</span>
            <Badge variant="secondary">{task.type}</Badge>
          </div>

          {task.assignees?.length > 0 && (
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Assignees</span>
              <div className="mt-1 space-y-1.5">
                {task.assignees.map((a, i) => {
                  const user = typeof a === 'string' ? null : (a as unknown as { name: string });
                  if (!user) return null;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <Avatar size={20} name={user.name} variant="beam" colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#8B8B9A', '#2E7D57']} />
                      <span className="text-sm text-primary">{user.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {task.sprint && typeof task.sprint === 'object' && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Sprint</span>
              <span className="text-sm text-primary">{(task.sprint as { name: string }).name}</span>
            </div>
          )}

          {task.tags.length > 0 && (
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Tags</span>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--color-border-subtle)] pt-3">
          <span className="text-xs text-[var(--color-text-muted)]">
            Created {format(new Date(task.createdAt), 'MMM d, yyyy')}
          </span>
        </div>

        <div className="border-t border-[var(--color-border-subtle)] pt-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-3">Comments</h4>
          <CommentList projectId={projectId} parentType="task" parentId={taskId} />
          <div className="mt-3">
            <CommentInput projectId={projectId} parentType="task" parentId={taskId} />
          </div>
        </div>
      </div>
    </div>
  );
}
