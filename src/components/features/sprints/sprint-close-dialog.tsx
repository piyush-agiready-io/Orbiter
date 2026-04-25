'use client';

import { useState } from 'react';
import { Warning } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTasks } from '@/hooks/queries/use-tasks';
import { useCloseSprint } from '@/hooks/queries/use-sprints';

interface SprintCloseDialogProps {
  sprintId: string;
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export function SprintCloseDialog({ sprintId, projectId, open, onClose }: SprintCloseDialogProps) {
  const { data: tasksData } = useTasks(projectId, { sprint: sprintId });
  const closeSprint = useCloseSprint(projectId);
  const [retroNotes, setRetroNotes] = useState('');
  const [rolloverAll, setRolloverAll] = useState(true);

  const tasks = tasksData?.tasks ?? [];
  const incompleteTasks = tasks.filter((t) => t.status !== 'done');
  const completedTasks = tasks.filter((t) => t.status === 'done');

  const handleClose = () => {
    closeSprint.mutate(
      {
        sprintId,
        data: {
          retroNotes: retroNotes || undefined,
          rolloverTaskIds: rolloverAll ? incompleteTasks.map((t) => t.id) : [],
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface border-[var(--color-border-subtle)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-primary">Close Sprint</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--color-border-subtle)] p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">Completed</span>
              <span className="font-medium text-[var(--color-success)]">{completedTasks.length} tasks</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-secondary">Incomplete</span>
              <span className="font-medium text-[var(--color-warning)]">{incompleteTasks.length} tasks</span>
            </div>
          </div>

          {incompleteTasks.length > 0 && (
            <div className="rounded-lg border border-[var(--color-warning-muted)] bg-[var(--color-warning-muted)] p-3">
              <div className="flex items-start gap-2">
                <Warning size={16} className="text-[var(--color-warning)] mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary">
                    {incompleteTasks.length} task{incompleteTasks.length > 1 ? 's' : ''} not done
                  </p>
                  <label className="mt-2 flex items-center gap-2 text-sm text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rolloverAll}
                      onChange={(e) => setRolloverAll(e.target.checked)}
                      className="rounded border-[var(--color-border-default)]"
                    />
                    Roll over to next sprint
                  </label>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium text-primary">Retro Notes</Label>
            <textarea
              value={retroNotes}
              onChange={(e) => setRetroNotes(e.target.value)}
              placeholder="What went well? What could improve?"
              rows={3}
              className="mt-1.5 w-full rounded-md border border-[var(--color-border-default)] bg-surface px-3 py-2 text-sm text-primary placeholder:text-[var(--color-text-muted)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleClose} disabled={closeSprint.isPending}>
              {closeSprint.isPending ? 'Closing...' : 'Close Sprint'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
