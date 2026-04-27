'use client';

import { use, useState } from 'react';
import { toast } from 'sonner';
import Avatar from 'boring-avatars';
import { Plus, DotsThree, PencilSimple, Trash, Flag } from '@phosphor-icons/react';
import { useEpics, useCreateEpic, useUpdateEpic, useDeleteEpic } from '@/hooks/queries/use-epics';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import type { IEpic, EpicStatus } from '@/modules/epics/epic.types';

const STATUS_CONFIG: Record<EpicStatus, { label: string; variant: 'secondary' | 'default' | 'outline'; className: string }> = {
  planning: { label: 'Planning', variant: 'secondary', className: '' },
  active: { label: 'Active', variant: 'default', className: 'bg-[var(--color-accent)] text-white' },
  done: { label: 'Done', variant: 'default', className: 'bg-[var(--color-success-muted)] text-[var(--color-success)]' },
};

interface EpicOwner {
  id?: string;
  name: string;
  email: string;
  avatar?: string;
}

interface PopulatedEpic extends Omit<IEpic, 'owner'> {
  owner: EpicOwner | string;
}

function formatDateRange(start?: Date | string, end?: Date | string): string {
  const fmt = (d: Date | string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  if (end) return `Until ${fmt(end)}`;
  return '';
}

function getOwnerName(owner: EpicOwner | string): string {
  if (typeof owner === 'string') return 'Unknown';
  return owner.name;
}

function toDateInputValue(date?: Date | string): string {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}

export default function EpicsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);

  const [showCreate, setShowCreate] = useState(false);
  const [editingEpic, setEditingEpic] = useState<PopulatedEpic | null>(null);
  const [deletingEpicId, setDeletingEpicId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filters: Record<string, string> = {};
  if (statusFilter !== 'all') filters.status = statusFilter;

  const { data, isLoading } = useEpics(projectId, filters);
  const epics: PopulatedEpic[] = (data as { epics?: PopulatedEpic[] })?.epics ?? [];
  const deleteEpic = useDeleteEpic(projectId);

  function handleDelete() {
    if (!deletingEpicId) return;
    deleteEpic.mutate(deletingEpicId, {
      onSuccess: () => {
        toast.success('Epic deleted');
        setDeletingEpicId(null);
      },
      onError: () => {
        toast.error('Failed to delete epic');
      },
    });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-primary">Epics</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={14} data-icon="inline-start" />
          New Epic
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-default bg-surface p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-3 h-4 w-1/2" />
              <Skeleton className="mt-3 h-2 w-full rounded-full" />
              <Skeleton className="mt-3 h-4 w-1/3" />
            </div>
          ))}

        {!isLoading && epics.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center">
            <Flag size={28} className="text-muted" />
            <p className="text-sm text-muted">No epics yet</p>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
              Create your first epic
            </Button>
          </div>
        )}

        {epics.map((epic) => {
          const statusCfg = STATUS_CONFIG[epic.status];
          const dateRange = formatDateRange(epic.startDate, epic.endDate);
          const ownerName = getOwnerName(epic.owner);

          return (
            <div
              key={epic.id}
              className="group rounded-lg border border-default bg-surface p-4 transition-colors duration-[120ms] ease-[ease] hover:border-subtle"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium text-primary leading-snug line-clamp-2">
                  {epic.title}
                </h3>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted opacity-0 transition-opacity hover:bg-subtle hover:text-primary group-hover:opacity-100"
                  >
                    <DotsThree size={16} weight="bold" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingEpic(epic)}>
                      <PencilSimple size={14} />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeletingEpicId(epic.id)}
                    >
                      <Trash size={14} />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Badge
                  variant={statusCfg.variant}
                  className={statusCfg.className}
                >
                  {statusCfg.label}
                </Badge>
                {dateRange && (
                  <span className="text-xs text-muted">{dateRange}</span>
                )}
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Progress</span>
                  <span>{epic.progress}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-accent-muted">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: `${epic.progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                <div className="h-5 w-5 overflow-hidden rounded-full">
                  <Avatar
                    size={20}
                    variant="beam"
                    name={ownerName}
                    colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']}
                  />
                </div>
                <span className="truncate text-xs text-secondary">{ownerName}</span>
              </div>
            </div>
          );
        })}
      </div>

      <CreateEpicDialog
        projectId={projectId}
        open={showCreate}
        onOpenChange={setShowCreate}
      />

      {editingEpic && (
        <EditEpicDialog
          projectId={projectId}
          epic={editingEpic}
          open={!!editingEpic}
          onOpenChange={(open) => { if (!open) setEditingEpic(null); }}
        />
      )}

      <ConfirmDialog
        open={!!deletingEpicId}
        onOpenChange={(open) => { if (!open) setDeletingEpicId(null); }}
        title="Delete epic"
        description="This will permanently delete the epic. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleteEpic.isPending}
      />
    </div>
  );
}

function CreateEpicDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<EpicStatus>('planning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const user = useAuth((s) => s.user);
  const createEpic = useCreateEpic(projectId);

  function reset() {
    setTitle('');
    setDescription('');
    setStatus('planning');
    setStartDate('');
    setEndDate('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const payload: Record<string, unknown> = {
      title: title.trim(),
      status,
      ownerId: user?.id,
    };
    if (description.trim()) payload.description = description.trim();
    if (startDate) payload.startDate = startDate;
    if (endDate) payload.endDate = endDate;

    createEpic.mutate(payload, {
      onSuccess: () => {
        toast.success('Epic created');
        reset();
        onOpenChange(false);
      },
      onError: () => {
        toast.error('Failed to create epic');
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Epic</DialogTitle>
          <DialogDescription>
            Create an epic to group related tasks and track progress.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="epic-title">Title</Label>
            <Input
              id="epic-title"
              placeholder="Epic name"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="epic-description">Description</Label>
            <textarea
              id="epic-description"
              placeholder="What does this epic cover?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-default bg-surface px-2.5 py-1.5 text-sm text-primary placeholder:text-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v as EpicStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="epic-start">Start Date</Label>
              <Input
                id="epic-start"
                type="date"
                value={startDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="epic-end">End Date</Label>
              <Input
                id="epic-end"
                type="date"
                value={endDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createEpic.isPending}>
              {createEpic.isPending ? 'Creating...' : 'Create Epic'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEpicDialog({
  projectId,
  epic,
  open,
  onOpenChange,
}: {
  projectId: string;
  epic: PopulatedEpic;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState(epic.title);
  const [description, setDescription] = useState(epic.description ?? '');
  const [status, setStatus] = useState<EpicStatus>(epic.status);
  const [startDate, setStartDate] = useState(toDateInputValue(epic.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(epic.endDate));
  const updateEpic = useUpdateEpic(projectId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const data: Record<string, unknown> = {
      title: title.trim(),
      status,
    };
    if (description.trim()) data.description = description.trim();
    if (startDate) data.startDate = startDate;
    if (endDate) data.endDate = endDate;

    updateEpic.mutate(
      { epicId: epic.id, data },
      {
        onSuccess: () => {
          toast.success('Epic updated');
          onOpenChange(false);
        },
        onError: () => {
          toast.error('Failed to update epic');
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Epic</DialogTitle>
          <DialogDescription>
            Update the epic details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-epic-title">Title</Label>
            <Input
              id="edit-epic-title"
              placeholder="Epic name"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-epic-description">Description</Label>
            <textarea
              id="edit-epic-description"
              placeholder="What does this epic cover?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-default bg-surface px-2.5 py-1.5 text-sm text-primary placeholder:text-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v as EpicStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-epic-start">Start Date</Label>
              <Input
                id="edit-epic-start"
                type="date"
                value={startDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-epic-end">End Date</Label>
              <Input
                id="edit-epic-end"
                type="date"
                value={endDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || updateEpic.isPending}>
              {updateEpic.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
