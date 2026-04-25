'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateTask } from '@/hooks/queries/use-tasks';
import { useSprints } from '@/hooks/queries/use-sprints';

const formSchema = z.object({
  title: z.string().min(2).max(300),
  description: z.string().max(5000).optional(),
  type: z.enum(['feature', 'chore', 'improvement']),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']),
  sprintId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TaskFormProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  defaultStatus?: string;
}

export function TaskForm({ projectId, open, onClose, defaultStatus = 'backlog' }: TaskFormProps) {
  const createTask = useCreateTask(projectId);
  const { data: sprintsData } = useSprints(projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'feature',
      priority: 'P2',
      status: defaultStatus as FormValues['status'],
    },
  });

  const onSubmit = (values: FormValues) => {
    createTask.mutate(values, {
      onSuccess: () => {
        form.reset();
        onClose();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface border-[var(--color-border-subtle)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-primary">New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-primary">Title</Label>
            <Input {...form.register('title')} placeholder="What needs to be done?" className="mt-1.5" />
            {form.formState.errors.title && (
              <p className="mt-1 text-xs text-[var(--color-error)]">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-primary">Description</Label>
            <textarea
              {...form.register('description')}
              placeholder="Add details..."
              rows={3}
              className="mt-1.5 w-full rounded-md border border-[var(--color-border-default)] bg-surface px-3 py-2 text-sm text-primary placeholder:text-[var(--color-text-muted)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium text-primary">Type</Label>
              <Select value={form.watch('type')} onValueChange={(v) => form.setValue('type', v as FormValues['type'])}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="chore">Chore</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-primary">Priority</Label>
              <Select value={form.watch('priority')} onValueChange={(v) => form.setValue('priority', v as FormValues['priority'])}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="P0">P0 — Urgent</SelectItem>
                  <SelectItem value="P1">P1 — High</SelectItem>
                  <SelectItem value="P2">P2 — Medium</SelectItem>
                  <SelectItem value="P3">P3 — Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-primary">Sprint</Label>
            <Select value={form.watch('sprintId') ?? ''} onValueChange={(v) => form.setValue('sprintId', v || undefined)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {sprintsData?.sprints?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
