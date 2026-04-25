'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateSprint } from '@/hooks/queries/use-sprints';
import { InfoTip } from '@/components/shared/info-tip';

const formSchema = z.object({
  name: z.string().min(2).max(200),
  goal: z.string().max(2000).optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface SprintFormProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export function SprintForm({ projectId, open, onClose }: SprintFormProps) {
  const createSprint = useCreateSprint(projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      goal: '',
      startDate: '',
      endDate: '',
    },
  });

  const onSubmit = (values: FormValues) => {
    createSprint.mutate(values, {
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
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base font-semibold text-primary">
              New Sprint
            </DialogTitle>
            <InfoTip text="A sprint is a 1-2 week iteration. Set a goal, pick dates, then start the sprint and assign tasks to it." />
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-primary">Name</Label>
            <Input {...form.register('name')} className="mt-1.5" placeholder="Sprint 1" />
            {form.formState.errors.name && (
              <p className="mt-1 text-sm text-error">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-primary">Goal</Label>
            <textarea
              {...form.register('goal')}
              rows={3}
              placeholder="What should this sprint achieve?"
              className="mt-1.5 w-full rounded-md border border-[var(--color-border-default)] bg-surface px-3 py-2 text-sm text-primary placeholder:text-[var(--color-text-muted)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium text-primary">Start Date</Label>
              <Input type="date" {...form.register('startDate')} className="mt-1.5" />
              {form.formState.errors.startDate && (
                <p className="mt-1 text-sm text-error">{form.formState.errors.startDate.message}</p>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium text-primary">End Date</Label>
              <Input type="date" {...form.register('endDate')} className="mt-1.5" />
              {form.formState.errors.endDate && (
                <p className="mt-1 text-sm text-error">{form.formState.errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createSprint.isPending}>
              {createSprint.isPending ? 'Creating...' : 'Create Sprint'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
