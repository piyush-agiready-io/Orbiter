'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowClockwise,
  GitBranch,
  GitCommit,
  GitPullRequest,
  GitMerge,
  CheckCircle,
  Sparkle,
  CircleNotch,
  Trash,
  SignOut,
  GithubLogo,
  Lock,
  BookOpen,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import {
  useGitHubData,
  useTriggerSync,
  useConnectGitHub,
  useDisconnectGitHub,
  useGitHubRepos,
  useGitHubReadme,
} from '@/hooks/queries/use-github';
import type { GitHubCommit, GitHubPR } from '@/hooks/queries/use-github';
import { useProject } from '@/hooks/queries/use-projects';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { InfoTip } from '@/components/shared/info-tip';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { SyncProgress } from './sync-progress';

interface GitHubDashboardProps {
  projectId: string;
}

interface GitHubRepo {
  owner: string;
  repo: string;
}

export function GitHubDashboard({ projectId }: GitHubDashboardProps) {
  const { data, isLoading } = useGitHubData(projectId);
  const { data: projectData } = useProject(projectId);
  const triggerSync = useTriggerSync(projectId);
  const connectGitHub = useConnectGitHub(projectId);
  const disconnectGitHub = useDisconnectGitHub(projectId);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [repoSearch, setRepoSearch] = useState('');
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'disconnect' | 'remove' | null>(null);
  const [syncRunning, setSyncRunning] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const [syncResult, setSyncResult] = useState<{ commitCount?: number; prCount?: number } | undefined>();

  const project = projectData as { githubRepos?: GitHubRepo[] } | undefined;
  const githubRepos = project?.githubRepos ?? [];

  const { data: availableReposData } = useGitHubRepos(projectId, !!data?.githubConnected && githubRepos.length === 0);
  const availableRepos = (availableReposData as { repos?: Array<{ owner: string; repo: string; fullName: string; private: boolean; description: string | null; linked: boolean }> })?.repos ?? [];
  const unlinkedRepos = availableRepos.filter((r) => !r.linked);

  const firstRepo = githubRepos[0];
  const { data: readmeData } = useGitHubReadme(
    projectId,
    firstRepo?.owner ?? '',
    firstRepo?.repo ?? '',
  );
  const readme = (readmeData as { readme?: string | null })?.readme ?? null;

  const updateRepos = useMutation({
    mutationFn: (repos: GitHubRepo[]) =>
      api.patch(`/projects/${projectId}`, { githubRepos: repos }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['github', projectId] });
      queryClient.invalidateQueries({ queryKey: ['github-repos', projectId] });
    },
  });

  const justConnected = searchParams.get('connected') === 'true';
  const callbackError = searchParams.get('error');

  useEffect(() => {
    if (justConnected) toast.success('GitHub connected');
    if (callbackError) {
      const messages: Record<string, string> = {
        invalid_state: 'Connection failed: state mismatch. Try again.',
        missing_params: 'Connection failed: GitHub did not return the expected response.',
        github_failed: 'Connection failed: GitHub returned an error. Try again.',
      };
      toast.error(messages[callbackError] ?? `Connection failed: ${callbackError}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justConnected, callbackError]);

  const handleConnect = () => {
    connectGitHub.mutate(undefined, {
      onSuccess: (result) => {
        const url = (result as { authUrl: string }).authUrl;
        window.location.href = url;
      },
      onError: (err) => {
        const message =
          (err as { message?: string })?.message ?? 'Failed to start GitHub connection';
        toast.error(message);
      },
    });
  };

  const handleDisconnect = () => {
    disconnectGitHub.mutate(undefined, {
      onSuccess: () => { setConfirmAction(null); toast.success('GitHub disconnected'); },
    });
  };

  const handleSync = () => {
    setSyncRunning(true);
    setSyncComplete(false);
    setSyncResult(undefined);
    triggerSync.mutate(undefined, {
      onSuccess: (result) => {
        const r = result as { commitCount?: number; prCount?: number } | undefined;
        setSyncResult(r ?? undefined);
        setSyncComplete(true);
        setSyncRunning(false);
        setTimeout(() => { setSyncComplete(false); setSyncRunning(false); }, 4000);
      },
      onError: () => {
        setSyncRunning(false);
        toast.error('Sync failed — check connection');
      },
    });
  };

  const handleRemoveRepo = () => {
    if (!firstRepo) return;
    updateRepos.mutate([], {
      onSuccess: () => { setConfirmAction(null); toast.success(`Removed ${firstRepo.owner}/${firstRepo.repo}`); },
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-subtle" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-subtle bg-surface" />
        ))}
      </div>
    );
  }

  // State 1: Not connected
  if (!data?.githubConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <GithubLogo size={48} weight="fill" className="text-[var(--color-text-muted)] mb-4" />
        <h2 className="text-base font-semibold text-primary">Connect GitHub</h2>
        <p className="mt-1 text-sm text-secondary max-w-sm text-center">
          Connect a GitHub account to this project to sync commits, pull requests, and get AI-powered summaries.
        </p>
        <Button className="mt-4" onClick={handleConnect} disabled={connectGitHub.isPending}>
          <GithubLogo size={16} weight="bold" className="mr-1.5" />
          {connectGitHub.isPending ? 'Connecting...' : 'Connect GitHub'}
        </Button>
      </div>
    );
  }

  // State 2: Connected but no repos — show search
  if (githubRepos.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-h2 font-semibold text-primary">GitHub</h2>
              <InfoTip text="Connect GitHub to sync commits and PRs. AI generates summaries. Commits with 'TASK-123' or 'fixes #123' auto-update task status." />
            </div>
            <p className="mt-0.5 text-sm text-secondary">
              Connected as <strong>{data.githubUsername}</strong>
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleDisconnect}>
            <SignOut size={14} className="mr-1" /> Disconnect
          </Button>
        </div>

        {justConnected && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-[var(--color-success-muted)] px-3 py-2">
            <CheckCircle size={16} weight="fill" className="text-[var(--color-success)]" />
            <p className="text-sm text-[var(--color-success)]">GitHub connected. Search and select a repository to get started.</p>
          </div>
        )}

        <div className="rounded-lg border border-subtle bg-surface p-6">
          <div className="text-center mb-4">
            <GitBranch size={32} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
            <h3 className="text-sm font-semibold text-primary">Select a Repository</h3>
            <p className="mt-1 text-xs text-secondary">Search your GitHub repositories to link one to this project.</p>
          </div>
          <RepoSearchInput
            repos={unlinkedRepos}
            search={repoSearch}
            onSearchChange={setRepoSearch}
            open={repoDropdownOpen}
            onOpenChange={setRepoDropdownOpen}
            onSelect={(fullName) => {
              const [owner, repo] = fullName.split('/');
              updateRepos.mutate([{ owner, repo }], {
                onSuccess: () => {
                  setRepoSearch('');
                  toast.success(`Added ${fullName}`);
                  setTimeout(() => handleSync(), 500);
                },
              });
            }}
          />
        </div>
      </div>
    );
  }

  // State 3: Connected with repos — full dashboard
  const allCommits = data.syncs.flatMap((s) => s.commits);
  const allPRs = data.syncs.flatMap((s) => s.pullRequests);
  const latestSummary = data.syncs.find((s) => s.summary);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-h2 font-semibold text-primary">GitHub</h2>
            <InfoTip text="Commits with 'TASK-123' or 'fixes #123' auto-update task status. Syncs every 6 hours automatically." />
          </div>
          <p className="mt-0.5 text-sm text-secondary">
            Connected as <strong>{data.githubUsername}</strong>
            {data.lastSyncAt && (
              <> — synced {formatDistanceToNow(new Date(data.lastSyncAt), { addSuffix: true })}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setConfirmAction('disconnect')}>
            <SignOut size={14} className="mr-1" /> Disconnect
          </Button>
          <Button size="sm" onClick={handleSync} disabled={syncRunning}>
            {syncRunning ? (
              <><CircleNotch size={14} className="mr-1.5 animate-spin" /> Syncing...</>
            ) : (
              <><ArrowClockwise size={14} className="mr-1.5" /> Sync Now</>
            )}
          </Button>
        </div>
      </div>

      {/* Sync Progress */}
      {(syncRunning || syncComplete) && (
        <SyncProgress isRunning={syncRunning} isComplete={syncComplete} result={syncResult} />
      )}

      {/* Connected Repo */}
      <div className="rounded-lg border border-subtle bg-surface p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-subtle">
              <GithubLogo size={20} weight="fill" className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary font-mono">{firstRepo.owner}/{firstRepo.repo}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Auto-syncs every 6 hours</p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" className="text-[var(--color-error)]" onClick={() => setConfirmAction('remove')}>
            <Trash size={14} />
          </Button>
        </div>
      </div>

      {/* AI Summary */}
      {latestSummary?.summary && (
        <div className="rounded-lg border border-subtle bg-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkle size={16} weight="fill" className="text-accent" />
            <h3 className="text-sm font-semibold text-primary">Latest AI Summary</h3>
          </div>
          <p className="text-sm text-secondary leading-relaxed">{latestSummary.summary}</p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            {latestSummary.commits.length} commits, {latestSummary.pullRequests.length} PRs — {formatDistanceToNow(new Date(latestSummary.createdAt), { addSuffix: true })}
          </p>
        </div>
      )}

      {/* README Overview */}
      {readme && (
        <div className="rounded-lg border border-subtle bg-surface p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-secondary" />
            <h3 className="text-sm font-semibold text-primary">Project Overview</h3>
          </div>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-secondary font-sans">{readme}</pre>
        </div>
      )}

      {/* Recent Commits */}
      <div className="rounded-lg border border-subtle bg-surface">
        <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
          <div className="flex items-center gap-2">
            <GitCommit size={16} className="text-secondary" />
            <h3 className="text-sm font-semibold text-primary">Recent Commits</h3>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">{allCommits.length} total</span>
        </div>
        {allCommits.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-secondary">No commits synced yet. Click "Sync Now" to fetch.</div>
        ) : (
          <div className="divide-y divide-subtle">
            {allCommits.slice(0, 10).map((commit, i) => (
              <div key={`${commit.sha}-${i}`} className="flex items-start gap-3 px-4 py-2.5">
                <GitCommit size={14} className="mt-0.5 shrink-0 text-[var(--color-text-muted)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary truncate">{commit.message.split('\n')[0]}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                    <span>{commit.author}</span>
                    <span className="font-mono">{commit.sha.slice(0, 7)}</span>
                    <span>{formatDistanceToNow(new Date(commit.date), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent PRs */}
      <div className="rounded-lg border border-subtle bg-surface">
        <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
          <div className="flex items-center gap-2">
            <GitPullRequest size={16} className="text-secondary" />
            <h3 className="text-sm font-semibold text-primary">Pull Requests</h3>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">{allPRs.length} total</span>
        </div>
        {allPRs.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-secondary">No pull requests synced yet.</div>
        ) : (
          <div className="divide-y divide-subtle">
            {allPRs.slice(0, 10).map((pr, i) => {
              const isMerged = pr.state === 'merged';
              const isOpen = pr.state === 'open';
              return (
                <div key={`${pr.repo}-${pr.number}-${i}`} className="flex items-start gap-3 px-4 py-2.5">
                  {isMerged ? (
                    <GitMerge size={14} weight="bold" className="mt-0.5 shrink-0 text-accent" />
                  ) : isOpen ? (
                    <GitPullRequest size={14} weight="bold" className="mt-0.5 shrink-0 text-[var(--color-success)]" />
                  ) : (
                    <CheckCircle size={14} className="mt-0.5 shrink-0 text-[var(--color-error)]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a href={pr.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:text-accent transition-colors truncate">
                        {pr.title}
                      </a>
                      <Badge className={
                        isMerged ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]'
                          : isOpen ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
                            : 'bg-[var(--color-error-muted)] text-[var(--color-error)]'
                      }>
                        {pr.state}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <span>#{pr.number}</span>
                      <span>{pr.author}</span>
                      <span className="text-[var(--color-success)]">+{pr.additions}</span>
                      <span className="text-[var(--color-error)]">-{pr.deletions}</span>
                      <span>{formatDistanceToNow(new Date(pr.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sync History */}
      {data.syncs.length > 1 && (
        <div className="rounded-lg border border-subtle bg-surface">
          <div className="flex items-center gap-2 border-b border-subtle px-4 py-3">
            <ArrowClockwise size={16} className="text-secondary" />
            <h3 className="text-sm font-semibold text-primary">Sync History</h3>
          </div>
          <div className="divide-y divide-subtle">
            {data.syncs.slice(0, 5).map((sync) => (
              <div key={sync.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} weight="fill" className="text-[var(--color-success)]" />
                  <span className="text-sm text-primary">
                    {sync.commits.length} commit{sync.commits.length !== 1 ? 's' : ''}
                    {sync.pullRequests.length > 0 && `, ${sync.pullRequests.length} PR${sync.pullRequests.length !== 1 ? 's' : ''}`}
                  </span>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {formatDistanceToNow(new Date(sync.createdAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction === 'disconnect'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Disconnect GitHub"
        description="This will remove the GitHub connection and all linked repositories from this project."
        confirmLabel="Disconnect"
        variant="danger"
        onConfirm={handleDisconnect}
        loading={disconnectGitHub.isPending}
      />
      <ConfirmDialog
        open={confirmAction === 'remove'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Remove repository"
        description={`${firstRepo?.owner}/${firstRepo?.repo} will be unlinked from this project. Sync history will be preserved.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={handleRemoveRepo}
        loading={updateRepos.isPending}
      />
    </div>
  );
}

function RepoSearchInput({
  repos,
  search,
  onSearchChange,
  open,
  onOpenChange,
  onSelect,
}: {
  repos: Array<{ fullName: string; private: boolean; description: string | null }>;
  search: string;
  onSearchChange: (v: string) => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (fullName: string) => void;
}) {
  const filtered = repos
    .filter((r) => !search || r.fullName.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="relative">
      <div className="relative">
        <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          placeholder="Search your repositories..."
          value={search}
          onChange={(e) => { onSearchChange(e.target.value); onOpenChange(true); }}
          onFocus={() => onOpenChange(true)}
          className="h-9 w-full rounded-md border border-[var(--color-border-default)] bg-surface pl-9 pr-3 text-sm text-primary placeholder:text-[var(--color-text-muted)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => onOpenChange(false)} />
          <div className="absolute left-0 right-0 top-10 z-50 max-h-64 overflow-y-auto rounded-lg border border-subtle bg-surface shadow-md">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-[var(--color-text-muted)] text-center">
                {repos.length === 0 ? 'Loading repositories...' : `No repos matching "${search}"`}
              </div>
            ) : (
              filtered.map((r) => (
                <button
                  key={r.fullName}
                  type="button"
                  onClick={() => onSelect(r.fullName)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-subtle"
                >
                  <GitBranch size={16} className="shrink-0 text-secondary" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {r.private && <Lock size={11} className="text-[var(--color-text-muted)]" />}
                      <span className="text-sm font-medium text-primary">{r.fullName}</span>
                    </div>
                    {r.description && (
                      <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{r.description}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
