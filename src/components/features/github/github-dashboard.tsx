'use client';

import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ArrowClockwise,
  GitBranch,
  GitCommit,
  GitPullRequest,
  GitMerge,
  CheckCircle,
  Clock,
  Sparkle,
  CircleNotch,
  Warning,
} from '@phosphor-icons/react';
import { useGitHubData, useTriggerSync } from '@/hooks/queries/use-github';
import type { SyncRecord, GitHubCommit, GitHubPR } from '@/hooks/queries/use-github';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface GitHubDashboardProps {
  projectId: string;
}

const PR_STATE_CONFIG: Record<string, { icon: React.ReactNode; style: string }> = {
  open: {
    icon: <GitPullRequest size={14} weight="bold" />,
    style: 'bg-[var(--color-success-muted)] text-[var(--color-success)]',
  },
  merged: {
    icon: <GitMerge size={14} weight="bold" />,
    style: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]',
  },
  closed: {
    icon: <CheckCircle size={14} />,
    style: 'bg-[var(--color-error-muted)] text-[var(--color-error)]',
  },
};

export function GitHubDashboard({ projectId }: GitHubDashboardProps) {
  const { data, isLoading } = useGitHubData(projectId);
  const triggerSync = useTriggerSync(projectId);
  const [activeTab, setActiveTab] = useState('overview');

  const handleSync = () => {
    triggerSync.mutate(undefined, {
      onSuccess: () => toast.success('GitHub sync complete'),
      onError: () => toast.error('Sync failed — check GitHub connection'),
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 animate-pulse rounded bg-subtle" />
          <div className="h-8 w-28 animate-pulse rounded bg-subtle" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-subtle bg-surface" />
        ))}
      </div>
    );
  }

  if (!data?.githubConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <GitBranch size={40} className="text-[var(--color-text-muted)] mb-4" />
        <h2 className="text-base font-semibold text-primary">GitHub not connected</h2>
        <p className="mt-1 text-sm text-secondary max-w-sm text-center">
          The project owner needs to connect their GitHub account in Settings to enable repository syncing.
        </p>
        <Button className="mt-4" onClick={() => window.location.href = '/settings'}>
          Go to Settings
        </Button>
      </div>
    );
  }

  if (data.repoCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <GitBranch size={40} className="text-[var(--color-text-muted)] mb-4" />
        <h2 className="text-base font-semibold text-primary">No repositories linked</h2>
        <p className="mt-1 text-sm text-secondary max-w-sm text-center">
          Add GitHub repositories in Project Settings to start syncing commits and pull requests.
        </p>
      </div>
    );
  }

  const allCommits = data.syncs.flatMap((s) => s.commits);
  const allPRs = data.syncs.flatMap((s) => s.pullRequests);
  const latestSummaries = data.syncs.filter((s) => s.summary);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-h2 font-semibold text-primary">GitHub</h2>
          <p className="mt-0.5 text-sm text-secondary">
            {data.repoCount} repo{data.repoCount !== 1 ? 's' : ''} linked
            {data.lastSyncAt && (
              <> — last synced {formatDistanceToNow(new Date(data.lastSyncAt), { addSuffix: true })}</>
            )}
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleSync}
          disabled={triggerSync.isPending}
        >
          {triggerSync.isPending ? (
            <><CircleNotch size={14} className="mr-1.5 animate-spin" /> Syncing...</>
          ) : (
            <><ArrowClockwise size={14} className="mr-1.5" /> Sync Now</>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => v && setActiveTab(v)}>
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="commits">Commits ({allCommits.length})</TabsTrigger>
          <TabsTrigger value="prs">Pull Requests ({allPRs.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4">
        {activeTab === 'overview' && (
          <OverviewTab syncs={data.syncs} summaries={latestSummaries} />
        )}
        {activeTab === 'commits' && <CommitsTab commits={allCommits} />}
        {activeTab === 'prs' && <PRsTab prs={allPRs} />}
      </div>
    </div>
  );
}

function OverviewTab({ syncs, summaries }: { syncs: SyncRecord[]; summaries: SyncRecord[] }) {
  if (syncs.length === 0) {
    return (
      <div className="rounded-lg border border-subtle bg-surface py-12 text-center">
        <Clock size={32} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
        <p className="text-sm text-secondary">No syncs yet. Click "Sync Now" to pull data from GitHub.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summaries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            AI Summaries
          </h3>
          {summaries.slice(0, 5).map((sync) => (
            <div
              key={sync.id}
              className="rounded-lg border border-subtle bg-surface p-4"
            >
              <div className="flex items-start gap-3">
                <Sparkle size={18} weight="fill" className="mt-0.5 shrink-0 text-accent" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary leading-relaxed">{sync.summary}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                    <span>{sync.commits.length} commits</span>
                    <span>{sync.pullRequests.length} PRs</span>
                    <span>{formatDistanceToNow(new Date(sync.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Sync History
        </h3>
        {syncs.map((sync) => (
          <div
            key={sync.id}
            className="flex items-center justify-between rounded-lg border border-subtle bg-surface px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <CheckCircle size={16} weight="fill" className="text-[var(--color-success)]" />
              <div>
                <p className="text-sm font-medium text-primary">
                  {sync.commits.length} commit{sync.commits.length !== 1 ? 's' : ''}
                  {sync.pullRequests.length > 0 && `, ${sync.pullRequests.length} PR${sync.pullRequests.length !== 1 ? 's' : ''}`}
                </p>
                {sync.summary && (
                  <p className="mt-0.5 text-xs text-secondary line-clamp-1">{sync.summary}</p>
                )}
              </div>
            </div>
            <span className="text-xs text-[var(--color-text-muted)] shrink-0">
              {formatDistanceToNow(new Date(sync.createdAt), { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommitsTab({ commits }: { commits: GitHubCommit[] }) {
  if (commits.length === 0) {
    return (
      <div className="rounded-lg border border-subtle bg-surface py-12 text-center">
        <GitCommit size={32} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
        <p className="text-sm text-secondary">No commits synced yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-subtle bg-surface divide-y divide-subtle">
      {commits.slice(0, 50).map((commit, i) => {
        const firstLine = commit.message.split('\n')[0];
        return (
          <div key={`${commit.sha}-${i}`} className="flex items-start gap-3 px-4 py-3">
            <GitCommit size={16} className="mt-0.5 shrink-0 text-[var(--color-text-muted)]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary truncate">{firstLine}</p>
              <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                <span>{commit.author}</span>
                <span className="font-mono">{commit.sha.slice(0, 7)}</span>
                <span>{commit.repo}</span>
                <span>{formatDistanceToNow(new Date(commit.date), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PRsTab({ prs }: { prs: GitHubPR[] }) {
  if (prs.length === 0) {
    return (
      <div className="rounded-lg border border-subtle bg-surface py-12 text-center">
        <GitPullRequest size={32} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
        <p className="text-sm text-secondary">No pull requests synced yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-subtle bg-surface divide-y divide-subtle">
      {prs.map((pr, i) => {
        const config = PR_STATE_CONFIG[pr.state];
        return (
          <div key={`${pr.repo}-${pr.number}-${i}`} className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 shrink-0">{config.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:text-accent transition-colors truncate"
                >
                  {pr.title}
                </a>
                <Badge className={config.style}>{pr.state}</Badge>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                <span>#{pr.number}</span>
                <span>{pr.author}</span>
                <span>{pr.repo}</span>
                <span className="text-[var(--color-success)]">+{pr.additions}</span>
                <span className="text-[var(--color-error)]">-{pr.deletions}</span>
                <span>{formatDistanceToNow(new Date(pr.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
