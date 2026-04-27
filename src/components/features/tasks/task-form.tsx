'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Avatar from 'boring-avatars';
import { X } from '@phosphor-icons/react';
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
import { useEpics } from '@/hooks/queries/use-epics';
import { useUsers } from '@/hooks/queries/use-users';
import { InfoTip } from '@/components/shared/info-tip';

const formSchema = z.object({
  title: z.string().min(2).max(300),
  description: z.string().max(5000).optional(),
  type: z.enum(['feature', 'chore', 'improvement']),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']),
  epicId: z.string().optional(),
  clientVisible: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface TaskFormProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  defaultStatus?: string;
  defaultSprintId?: string;
}

export function TaskForm({
  projectId,
  open,
  onClose,
  defaultStatus = 'backlog',
  defaultSprintId,
}: TaskFormProps) {
  const createTask = useCreateTask(projectId);
  const { data: sprintsData } = useSprints(projectId);
  const { data: epicsData } = useEpics(projectId);
  const { data: usersData } = useUsers();
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [sprintId, setSprintId] = useState<string | undefined>(defaultSprintId);
  const sprintLocked = !!defaultSprintId;
  const lockedSprintName = sprintLocked
    ? sprintsData?.sprints?.find((s) => s.id === defaultSprintId)?.name ?? 'Sprint'
    : null;

  const allUsers = ((usersData as { users?: { id: string; name: string; email: string; role: string; inviteStatus?: string }[] })?.users ?? [])
    .filter((u) => u.role !== 'client' && u.inviteStatus === 'active');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'feature',
      priority: 'P2',
      status: defaultStatus as FormValues['status'],
      clientVisible: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: '',
        description: '',
        type: 'feature',
        priority: 'P2',
        status: defaultStatus as FormValues['status'],
        clientVisible: true,
      });
      setSelectedAssignees([]);
      setSprintId(defaultSprintId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultStatus, defaultSprintId]);

  const onSubmit = (values: FormValues) => {
    const finalSprintId = defaultSprintId ?? sprintId;
    createTask.mutate(
      { ...values, sprintId: finalSprintId, assigneeIds: selectedAssignees },
      {
        onSuccess: () => {
          form.reset();
          setSelectedAssignees([]);
          setSprintId(undefined);
          onClose();
        },
      },
    );
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const selectedUsers = allUsers.filter((u) => selectedAssignees.includes(u.id));
  const availableUsers = allUsers.filter((u) => !selectedAssignees.includes(u.id));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface border-[var(--color-border-subtle)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-primary">New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-primary">Title</Label>
            <Input {...form.register('title')} placeholder="What needs to be done?" className="mt-1.5" autoFocus />
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
              <div className="flex items-center gap-1.5">
                <Label className="text-sm font-medium text-primary">Priority</Label>
                <InfoTip text="P0: Critical. P1: High. P2: Medium (default). P3: Low. AI auto-classifies if ChatGPT connected." />
              </div>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium text-primary">Epic</Label>
              <Select
                value={form.watch('epicId') ?? '__none__'}
                onValueChange={(v) => {
                  const next: string | undefined =
                    !v || v === '__none__' ? undefined : (v as string);
                  form.setValue('epicId', next);
                }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {epicsData?.epics?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-primary">Sprint</Label>
              {sprintLocked ? (
                <div className="mt-1.5 flex h-9 items-center rounded-md border border-subtle bg-subtle/40 px-3 text-sm text-primary">
                  {lockedSprintName}
                </div>
              ) : (
                <Select
                  value={sprintId ?? '__none__'}
                  onValueChange={(v) => {
                    const next: string | undefined =
                      !v || v === '__none__' ? undefined : (v as string);
                    setSprintId(next);
                  }}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {sprintsData?.sprints?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Assignees multi-select */}
          <div>
            <Label className="text-sm font-medium text-primary">Assign to</Label>
            {selectedUsers.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {selectedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 rounded-full bg-accent-muted px-2 py-0.5 text-xs font-medium text-accent-text"
                  >
                    <Avatar size={14} name={u.name} variant="beam" colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']} />
                    {u.name}
                    <button type="button" onClick={() => toggleAssignee(u.id)} className="ml-0.5 hover:text-accent">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {availableUsers.length > 0 && (
              <Select value="" onValueChange={(v) => v && toggleAssignee(v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select team members..." /></SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <label className="flex items-start gap-2.5 rounded-md border border-subtle bg-subtle/30 px-3 py-2.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.watch('clientVisible')}
              onChange={(e) => form.setValue('clientVisible', e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-default text-accent focus:ring-accent/20"
            />
            <div className="flex-1">
              <span className="font-medium text-primary">Visible to client</span>
              <p className="text-xs text-muted">
                Clients in this project can see this task in their portal. Uncheck for internal-only work.
              </p>
            </div>
          </label>

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
