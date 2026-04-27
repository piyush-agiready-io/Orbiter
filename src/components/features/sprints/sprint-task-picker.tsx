'use client';

import { useState, useMemo } from 'react';
import { useTasks, useBulkUpdateTasks } from '@/hooks/queries/use-tasks';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { ITask } from '@/modules/tasks/task.types';

interface SprintTaskPickerProps {
  projectId: string;
  sprintId: string;
  open: boolean;
  onClose: () => void;
}

const PRIORITY_TINT: Record<string, string> = {
  P0: 'bg-[var(--color-error-muted)] text-[var(--color-error)]',
  P1: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
  P2: 'bg-[var(--color-info-muted)] text-[var(--color-info)]',
  P3: 'bg-subtle text-secondary',
};

export function SprintTaskPicker({
  projectId,
  sprintId,
  open,
  onClose,
}: SprintTaskPickerProps) {
  const { data, isLoading } = useTasks(projectId, { limit: '200' });
  const bulkUpdate = useBulkUpdateTasks(projectId);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const candidates = useMemo(() => {
    const tasks = (data?.tasks ?? []) as ITask[];
    return tasks.filter((t) => {
      if (t.status === 'done') return false;
      const sprintRef = t.sprint as unknown;
      if (!sprintRef) return true;
      const taskSprintId =
        typeof sprintRef === 'string'
          ? sprintRef
          : (sprintRef as { id?: string; _id?: string }).id ??
            (sprintRef as { _id?: string })._id;
      return taskSprintId !== sprintId;
    });
  }, [data?.tasks, sprintId]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    if (selected.size === 0) return;
    bulkUpdate.mutate(
      { taskIds: Array.from(selected), update: { sprintId } },
      {
        onSuccess: () => {
          setSelected(new Set());
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface border-[var(--color-border-subtle)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-primary">
            Add Tasks to Sprint
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-secondary">
            Showing tasks not yet in any sprint. Click to select.
          </p>

          <div className="max-h-[50vh] overflow-y-auto rounded-md border border-subtle">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted">Loading…</div>
            ) : candidates.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted">
                No unassigned tasks. Create one with <strong>New Task</strong> instead.
              </div>
            ) : (
              <ul className="divide-y divide-subtle">
                {candidates.map((task) => {
                  const isSelected = selected.has(task.id);
                  return (
                    <li
                      key={task.id}
                      onClick={() => toggle(task.id)}
                      className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-subtle ${
                        isSelected ? 'bg-accent-muted/40' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(task.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 shrink-0 cursor-pointer rounded border-default text-accent focus:ring-accent/20"
                      />
                      <Badge className={`shrink-0 ${PRIORITY_TINT[task.priority] ?? ''}`}>
                        {task.priority}
                      </Badge>
                      <span className="flex-1 text-sm text-primary truncate">
                        {task.title}
                      </span>
                      <span className="shrink-0 text-xs text-muted capitalize">
                        {task.status.replace('_', ' ')}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted">
              {selected.size} selected
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={selected.size === 0 || bulkUpdate.isPending}
              >
                {bulkUpdate.isPending
                  ? 'Adding…'
                  : selected.size > 0
                    ? `Add ${selected.size} Task${selected.size === 1 ? '' : 's'}`
                    : 'Add to Sprint'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
