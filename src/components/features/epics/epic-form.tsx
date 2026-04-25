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
import { useCreateEpic, useUpdateEpic, useEpic } from '@/hooks/queries/use-epics';

const formSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(['planning', 'active', 'done']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EpicFormProps {
  projectId: string;
  epicId?: string;
  open: boolean;
  onClose: () => void;
}

export function EpicForm({ projectId, epicId, open, onClose }: EpicFormProps) {
  const isEditing = !!epicId;
  const { data: existingEpic } = useEpic(epicId ?? '');
  const createEpic = useCreateEpic(projectId);
  const updateEpic = useUpdateEpic(epicId ?? '', projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'planning',
    },
    values: existingEpic
      ? {
          title: existingEpic.title,
          description: existingEpic.description ?? '',
          status: existingEpic.status,
          startDate: existingEpic.startDate
            ? new Date(existingEpic.startDate).toISOString().split('T')[0]
            : undefined,
          endDate: existingEpic.endDate
            ? new Date(existingEpic.endDate).toISOString().split('T')[0]
            : undefined,
        }
      : undefined,
  });

  const onSubmit = (values: FormValues) => {
    if (isEditing) {
      updateEpic.mutate(values, { onSuccess: onClose });
    } else {
      createEpic.mutate(values, {
        onSuccess: () => { form.reset(); onClose(); },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface border-[var(--color-border-subtle)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-primary">
            {isEditing ? 'Edit Epic' : 'New Epic'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-primary">Title</Label>
            <Input {...form.register('title')} className="mt-1.5" />
          </div>

          <div>
            <Label className="text-sm font-medium text-primary">Description</Label>
            <textarea
              {...form.register('description')}
              rows={3}
              className="mt-1.5 w-full rounded-md border border-[var(--color-border-default)] bg-surface px-3 py-2 text-sm text-primary placeholder:text-[var(--color-text-muted)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-sm font-medium text-primary">Status</Label>
              <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', (v ?? 'planning') as FormValues['status'])}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-primary">Start Date</Label>
              <Input type="date" {...form.register('startDate')} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-sm font-medium text-primary">End Date</Label>
              <Input type="date" {...form.register('endDate')} className="mt-1.5" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createEpic.isPending || updateEpic.isPending}>
              {isEditing ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
