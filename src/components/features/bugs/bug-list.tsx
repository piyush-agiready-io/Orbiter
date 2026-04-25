'use client';

import { useState } from 'react';
import Link from 'next/link';
import Avatar from 'boring-avatars';
import { Bug as BugIcon, Plus } from '@phosphor-icons/react';
import { useBugs } from '@/hooks/queries/use-bugs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoTip } from '@/components/shared/info-tip';
import { CreateBugDialog } from './create-bug-dialog';

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

interface BugItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  source: string;
  reporter: { name: string; email: string; avatar?: string };
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function BugList({ projectId }: { projectId: string }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);

  const filters: Record<string, string> = {};
  if (search) filters.search = search;
  if (statusFilter !== 'all') filters.status = statusFilter;
  if (priorityFilter !== 'all') filters.priority = priorityFilter;

  const { data, isLoading } = useBugs(projectId, filters);
  const bugs: BugItem[] = (data as { bugs?: BugItem[] })?.bugs ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-primary">Bugs</h2>
          <InfoTip text="Track bugs reported manually or via the Chrome extension. Bugs are prioritized P0-P3 and can be linked to tasks. AI auto-classifies priority." />
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={14} data-icon="inline-start" />
          Report Bug
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Input
          placeholder="Search bugs..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="w-56"
        />
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => v && setPriorityFilter(v)}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="P0">P0 — Urgent</SelectItem>
            <SelectItem value="P1">P1 — High</SelectItem>
            <SelectItem value="P2">P2 — Medium</SelectItem>
            <SelectItem value="P3">P3 — Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 rounded-lg border border-subtle">
        <div className="grid grid-cols-[1fr_80px_100px_120px_100px] gap-4 border-b border-default bg-subtle px-4 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Title</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Priority</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Status</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Reporter</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Created</span>
        </div>

        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_100px_120px_100px] gap-4 border-b border-subtle px-4 py-2.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-14" />
            </div>
          ))}

        {!isLoading && bugs.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <BugIcon size={24} className="text-muted" />
            <p className="text-sm text-muted">No bugs found</p>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
              Report a bug
            </Button>
          </div>
        )}

        {bugs.map((bug) => (
          <Link
            key={bug.id}
            href={`/projects/${projectId}/bugs/${bug.id}`}
            className="grid grid-cols-[1fr_80px_100px_120px_100px] gap-4 border-b border-subtle px-4 py-2.5 transition-colors duration-[120ms] ease-[ease] last:border-b-0 hover:bg-subtle"
          >
            <span className="truncate text-sm text-primary">{bug.title}</span>
            <span>
              <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[bug.priority]}`}>
                {bug.priority}
              </span>
            </span>
            <span>
              <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[bug.status]}`}>
                {bug.status}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <div className="h-5 w-5 overflow-hidden rounded-full">
                <Avatar size={20} variant="beam" name={bug.reporter.name} colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']} />
              </div>
              <span className="truncate text-xs text-secondary">{bug.reporter.name}</span>
            </span>
            <span className="text-xs text-muted">{timeAgo(bug.createdAt)}</span>
          </Link>
        ))}
      </div>

      <CreateBugDialog
        projectId={projectId}
        open={showCreate}
        onOpenChange={setShowCreate}
      />
    </div>
  );
}
