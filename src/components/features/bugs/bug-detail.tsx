'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Trash,
  LinkSimple,
  Globe,
  Camera,
  Terminal,
  Kanban,
  ArrowRight,
  X,
} from '@phosphor-icons/react';
import Avatar from 'boring-avatars';
import { toast } from 'sonner';
import {
  useBug,
  useUpdateBug,
  useDeleteBug,
  useLinkBug,
  useConvertBugToTask,
} from '@/hooks/queries/use-bugs';
import { useTasks } from '@/hooks/queries/use-tasks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CommentList } from '@/components/features/comments/comment-list';
import { CommentInput } from '@/components/features/comments/comment-input';
import type { ITask } from '@/modules/tasks/task.types';

const PRIORITY_STYLES: Record<string, string> = {
  P0: 'bg-[var(--color-p0-muted)] text-[var(--color-p0)]',
  P1: 'bg-[var(--color-p1-muted)] text-[var(--color-p1)]',
  P2: 'bg-[var(--color-p2-muted)] text-[var(--color-p2)]',
  P3: 'bg-[var(--color-p3-muted)] text-[var(--color-p3)]',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-[var(--color-info-muted)] text-[var(--color-info)]',
  investigating: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
  resolved: 'bg-[var(--color-success-muted)] text-[var(--color-success)]',
  closed: 'bg-subtle text-muted',
};

interface BugData {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  source: string;
  reporter: { name: string; email: string; avatar?: string };
  task?: { id?: string; _id?: string; title: string; status: string };
  metadata: {
    url?: string;
    device?: string;
    browser?: string;
    os?: string;
    viewport?: { width: number; height: number };
    consoleLogs?: string;
    screenshot?: string;
  };
  createdAt: string;
  updatedAt: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BugDetail({ projectId, bugId }: { projectId: string; bugId: string }) {
  const router = useRouter();
  const { data, isLoading } = useBug(bugId);
  const updateBug = useUpdateBug(projectId);
  const deleteBug = useDeleteBug(projectId);
  const linkBug = useLinkBug(projectId);
  const convertBug = useConvertBugToTask(projectId);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const bug = data as BugData | undefined;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!bug) return null;

  function handleStatusChange(status: string | null) {
    if (!status) return;
    updateBug.mutate({ bugId, data: { status } });
  }

  function handlePriorityChange(priority: string | null) {
    if (!priority) return;
    updateBug.mutate({ bugId, data: { priority } });
  }

  function handleDelete() {
    deleteBug.mutate(bugId, {
      onSuccess: () => {
        toast.success('Bug deleted');
        router.push(`/projects/${projectId}/bugs`);
      },
    });
  }

  const hasMetadata =
    bug.metadata.url ||
    bug.metadata.device ||
    bug.metadata.browser ||
    bug.metadata.os ||
    bug.metadata.consoleLogs ||
    bug.metadata.screenshot;

  return (
    <div>
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/projects/${projectId}/bugs`)}
        >
          <ArrowLeft size={14} data-icon="inline-start" />
          Back to bugs
        </Button>
        <div className="flex items-center gap-2">
          {!bug.task && (
            <>
              <Button
                size="sm"
                onClick={() =>
                  convertBug.mutate(bugId, {
                    onSuccess: (result) => {
                      const r = result as { taskId: string; projectId: string };
                      toast.success('Bug converted to a task');
                      router.push(`/projects/${r.projectId}/board?task=${r.taskId}`);
                    },
                  })
                }
                disabled={convertBug.isPending}
              >
                <Kanban size={14} className="mr-1.5" />
                {convertBug.isPending ? 'Converting…' : 'Convert to Task'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setLinkDialogOpen(true)}
              >
                <LinkSimple size={14} className="mr-1.5" />
                Link Existing Task
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon-sm" onClick={handleDelete}>
            <Trash size={16} className="text-[var(--color-error)]" />
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <h1 className="text-xl font-semibold tracking-tight text-primary">{bug.title}</h1>
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[bug.priority]}`}>
            {bug.priority}
          </span>
          <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[bug.status]}`}>
            {bug.status}
          </span>
          <Badge variant="secondary">{bug.source}</Badge>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[1fr_240px] gap-6">
        <div className="min-w-0">
          {bug.description && (
            <div className="rounded-lg border border-subtle p-4">
              <p className="text-sm text-secondary whitespace-pre-wrap">{bug.description}</p>
            </div>
          )}

          {hasMetadata && (
            <div className="mt-4 space-y-4">
              {/* Capture Details */}
              {(bug.metadata.url || bug.metadata.browser || bug.metadata.os || bug.metadata.device || bug.metadata.viewport) && (
                <div className="rounded-lg bg-subtle p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe size={14} className="text-[var(--color-text-muted)]" />
                    <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Capture Details</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    {bug.metadata.url && (
                      <div className="flex gap-3">
                        <span className="w-16 shrink-0 text-[var(--color-text-muted)]">URL</span>
                        <a
                          href={bug.metadata.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate font-mono text-xs text-[var(--color-accent-text)] hover:underline"
                        >
                          {bug.metadata.url}
                        </a>
                      </div>
                    )}
                    {bug.metadata.browser && (
                      <div className="flex gap-3">
                        <span className="w-16 shrink-0 text-[var(--color-text-muted)]">Browser</span>
                        <span className="text-secondary">{bug.metadata.browser}</span>
                      </div>
                    )}
                    {bug.metadata.os && (
                      <div className="flex gap-3">
                        <span className="w-16 shrink-0 text-[var(--color-text-muted)]">OS</span>
                        <span className="text-secondary">{bug.metadata.os}</span>
                      </div>
                    )}
                    {bug.metadata.viewport && (
                      <div className="flex gap-3">
                        <span className="w-16 shrink-0 text-[var(--color-text-muted)]">Viewport</span>
                        <span className="text-secondary">
                          {bug.metadata.viewport.width} &times; {bug.metadata.viewport.height}
                        </span>
                      </div>
                    )}
                    {bug.metadata.device && (
                      <div className="flex gap-3">
                        <span className="w-16 shrink-0 text-[var(--color-text-muted)]">Device</span>
                        <span className="text-secondary">{bug.metadata.device}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Screenshot */}
              {bug.metadata.screenshot && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Camera size={14} className="text-[var(--color-text-muted)]" />
                    <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Screenshot</h3>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-subtle">
                    <img
                      src={bug.metadata.screenshot}
                      alt={`Screenshot for bug: ${bug.title}`}
                      className="w-full object-cover object-top"
                      style={{ maxHeight: '400px' }}
                    />
                  </div>
                </div>
              )}

              {/* Console Logs */}
              {bug.metadata.consoleLogs && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal size={14} className="text-[var(--color-text-muted)]" />
                    <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                      Console Logs
                    </h3>
                  </div>
                  <pre className="max-h-48 overflow-auto rounded-lg border border-subtle bg-subtle p-3 font-mono text-xs leading-relaxed text-secondary">
                    {bug.metadata.consoleLogs}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-sm font-medium text-primary">Comments</h3>
            <Separator className="my-3" />
            <CommentList projectId={projectId} parentType="bug" parentId={bugId} />
            <div className="mt-4">
              <CommentInput projectId={projectId} parentType="bug" parentId={bugId} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-subtle p-3">
            <div className="space-y-3">
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted">Status</span>
                <Select value={bug.status} onValueChange={handleStatusChange}>
                  <SelectTrigger size="sm" className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted">Priority</span>
                <Select value={bug.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger size="sm" className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P0">P0 — Urgent</SelectItem>
                    <SelectItem value="P1">P1 — High</SelectItem>
                    <SelectItem value="P2">P2 — Medium</SelectItem>
                    <SelectItem value="P3">P3 — Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted">Reporter</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-5 w-5 overflow-hidden rounded-full">
                    <Avatar size={20} variant="beam" name={bug.reporter.name} colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']} />
                  </div>
                  <span className="text-sm text-secondary">{bug.reporter.name}</span>
                </div>
              </div>
              {bug.task && (
                <>
                  <Separator />
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-muted">
                      Linked Task
                    </span>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const taskId = bug.task?.id ?? bug.task?._id;
                          if (taskId) {
                            router.push(
                              `/projects/${projectId}/board?task=${taskId}`,
                            );
                          }
                        }}
                        className="flex flex-1 items-center gap-1.5 text-left text-sm text-[var(--color-accent-text)] hover:underline"
                      >
                        <LinkSimple size={14} className="shrink-0" />
                        <span className="truncate">{bug.task.title}</span>
                        <ArrowRight size={12} className="shrink-0" />
                      </button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="Unlink"
                        onClick={() =>
                          linkBug.mutate(
                            { bugId, taskId: null },
                            { onSuccess: () => toast.success('Task unlinked') },
                          )
                        }
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  </div>
                </>
              )}
              <Separator />
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted">Created</span>
                <p className="mt-0.5 text-sm text-secondary">{formatDate(bug.createdAt)}</p>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted">Updated</span>
                <p className="mt-0.5 text-sm text-secondary">{formatDate(bug.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LinkTaskDialog
        projectId={projectId}
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        onPick={(taskId) => {
          linkBug.mutate(
            { bugId, taskId },
            {
              onSuccess: () => {
                setLinkDialogOpen(false);
                toast.success('Bug linked to task');
              },
            },
          );
        }}
      />
    </div>
  );
}

interface LinkTaskDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onPick: (taskId: string) => void;
}

function LinkTaskDialog({ projectId, open, onClose, onPick }: LinkTaskDialogProps) {
  const { data, isLoading } = useTasks(projectId, { limit: '200' });
  const tasks = (data?.tasks ?? []) as ITask[];
  const [search, setSearch] = useState('');
  const filtered = search.trim()
    ? tasks.filter((t) => t.title.toLowerCase().includes(search.trim().toLowerCase()))
    : tasks.slice(0, 30);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface border-[var(--color-border-subtle)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-primary">
            Link to Existing Task
          </DialogTitle>
        </DialogHeader>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks…"
          className="h-9 w-full rounded-md border border-default bg-surface px-3 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <div className="max-h-[50vh] overflow-y-auto rounded-md border border-subtle">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted">No tasks match.</div>
          ) : (
            <ul className="divide-y divide-subtle">
              {filtered.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onPick(t.id)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-subtle"
                  >
                    <Badge className="shrink-0">{t.priority}</Badge>
                    <span className="flex-1 text-sm text-primary truncate">{t.title}</span>
                    <span className="shrink-0 text-xs text-muted capitalize">
                      {t.status.replace('_', ' ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
