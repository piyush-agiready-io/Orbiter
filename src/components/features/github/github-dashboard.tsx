'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
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
  Trash,
  SignOut,
  GithubLogo,
  Lock,
  BookOpen,
} from '@phosphor-icons/react';
import {
  useGitHubData,
  useTriggerSync,
  useConnectGitHub,
  useDisconnectGitHub,
  useGitHubRepos,
  useGitHubReadme,
} from '@/hooks/queries/use-github';
import type { SyncRecord, GitHubCommit, GitHubPR } from '@/hooks/queries/use-github';
import { useProject } from '@/hooks/queries/use-projects';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { InfoTip } from '@/components/shared/info-tip';

interface GitHubDashboardProps {
  projectId: string;
}

interface GitHubRepo {
  owner: string;
  repo: string;
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
  const { data: projectData } = useProject(projectId);
  const triggerSync = useTriggerSync(projectId);
  const connectGitHub = useConnectGitHub(projectId);
  const disconnectGitHub = useDisconnectGitHub(projectId);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRepoToAdd, setSelectedRepoToAdd] = useState('');
  const [readmeRepo, setReadmeRepo] = useState<{ owner: string; repo: string } | null>(null);

  const project = projectData as { githubRepos?: GitHubRepo[] } | undefined;
  const githubRepos = project?.githubRepos ?? [];

  const { data: availableReposData } = useGitHubRepos(projectId, !!data?.githubConnected);
  const availableRepos = (availableReposData as { repos?: Array<{ owner: string; repo: string; fullName: string; private: boolean; description: string | null; linked: boolean }> })?.repos ?? [];
  const unlinkedRepos = availableRepos.filter((r) => !r.linked);

  const { data: readmeData } = useGitHubReadme(
    projectId,
    readmeRepo?.owner ?? '',
    readmeRepo?.repo ?? '',
  );
  const readme = (readmeData as { readme?: string | null })?.readme ?? null;

  useEffect(() => {
    if (githubRepos.length > 0 && !readmeRepo) {
      setReadmeRepo({ owner: githubRepos[0].owner, repo: githubRepos[0].repo });
    }
  }, [githubRepos, readmeRepo]);

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

  const handleConnect = () => {
    connectGitHub.mutate(undefined, {
      onSuccess: (result) => {
        const url = (result as { authUrl: string }).authUrl;
        window.location.href = url;
      },
      onError: () => toast.error('Failed to start GitHub connection'),
    });
  };

  const handleDisconnect = () => {
    if (!confirm('Disconnect GitHub? This will remove all linked repos.')) return;
    disconnectGitHub.mutate(undefined, {
      onSuccess: () => toast.success('GitHub disconnected'),
    });
  };

  const handleSync = () => {
    triggerSync.mutate(undefined, {
      onSuccess: () => toast.success('GitHub sync complete'),
      onError: () => toast.error('Sync failed — check connection'),
    });
  };

  const handleAddRepo = () => {
    if (!selectedRepoToAdd) return;
    const [owner, repo] = selectedRepoToAdd.split('/');
    if (githubRepos.some((r) => r.owner === owner && r.repo === repo)) return;

    const isFirstRepo = githubRepos.length === 0;
    updateRepos.mutate([...githubRepos, { owner, repo }], {
      onSuccess: () => {
        setSelectedRepoToAdd('');
        toast.success(`Added ${owner}/${repo}`);
        if (isFirstRepo) {
          setTimeout(() => {
            triggerSync.mutate(undefined, {
              onSuccess: () => toast.success('Initial sync complete'),
            });
          }, 500);
        }
      },
    });
  };

  const handleRemoveRepo = (target: GitHubRepo) => {
    updateRepos.mutate(
      githubRepos.filter((r) => !(r.owner === target.owner && r.repo === target.repo)),
      { onSuccess: () => toast.success(`Removed ${target.owner}/${target.repo}`) },
    );
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

  const allCommits = data.syncs.flatMap((s) => s.commits);
  const allPRs = data.syncs.flatMap((s) => s.pullRequests);
  const summaries = data.syncs.filter((s) => s.summary);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-h2 font-semibold text-primary">GitHub</h2>
            <InfoTip text="Connect GitHub to sync commits and PRs. AI generates summaries of synced activity. Commits with 'TASK-123' or 'fixes #123' auto-update task status." />
          </div>
          <p className="mt-0.5 text-sm text-secondary">
            Connected as <strong>{data.githubUsername}</strong>
            {' — '}{data.repoCount} repo{data.repoCount !== 1 ? 's' : ''} linked
            {data.lastSyncAt && (
              <> — synced {formatDistanceToNow(new Date(data.lastSyncAt), { addSuffix: true })}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleDisconnect}>
            <SignOut size={14} className="mr-1" /> Disconnect
          </Button>
          <Button size="sm" onClick={handleSync} disabled={triggerSync.isPending || data.repoCount === 0}>
            {triggerSync.isPending ? (
              <><CircleNotch size={14} className="mr-1.5 animate-spin" /> Syncing...</>
            ) : (
              <><ArrowClockwise size={14} className="mr-1.5" /> Sync Now</>
            )}
          </Button>
        </div>
      </div>

      {justConnected && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-[var(--color-success-muted)] px-3 py-2">
          <CheckCircle size={16} weight="fill" className="text-[var(--color-success)]" />
          <p className="text-sm text-[var(--color-success)]">GitHub connected. Select a repository below to start syncing.</p>
        </div>
      )}

      {/* Repos Section */}
      <div className="mb-6 rounded-lg border border-subtle bg-surface p-4">
        <h3 className="text-sm font-semibold text-primary mb-3">Repositories</h3>
        {githubRepos.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {githubRepos.map((repo) => (
              <div
                key={`${repo.owner}/${repo.repo}`}
                className="group flex items-center justify-between rounded-md border border-[var(--color-border-subtle)] px-3 py-2"
              >
                <div className="flex items-center gap-2 text-sm">
                  <GitBranch size={14} className="text-secondary" />
                  <span className="font-mono text-xs text-primary">{repo.owner}/{repo.repo}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-[var(--color-error)] opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveRepo(repo)}
                >
                  <Trash size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Select value={selectedRepoToAdd} onValueChange={(v) => setSelectedRepoToAdd(v ?? '')}>
            <SelectTrigger className="flex-1 font-mono text-xs">
              <SelectValue placeholder="Select a repository to add..." />
            </SelectTrigger>
            <SelectContent>
              {unlinkedRepos.length === 0 ? (
                <div className="px-3 py-2 text-xs text-[var(--color-text-muted)]">
                  {availableRepos.length === 0 ? 'Loading repositories...' : 'All repos are linked'}
                </div>
              ) : (
                unlinkedRepos.map((r) => (
                  <SelectItem key={r.fullName} value={r.fullName}>
                    <div className="flex items-center gap-2">
                      {r.private && <Lock size={12} className="text-[var(--color-text-muted)]" />}
                      <span>{r.fullName}</span>
                      {r.description && (
                        <span className="text-[var(--color-text-muted)] truncate max-w-[200px]">
                          — {r.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAddRepo}
            disabled={!selectedRepoToAdd || updateRepos.isPending}
          >
            {updateRepos.isPending ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </div>

      {/* README Overview */}
      {readme && githubRepos.length > 0 && (
        <div className="mb-6 rounded-lg border border-subtle bg-surface p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-secondary" />
            <h3 className="text-sm font-semibold text-primary">Repository Overview</h3>
            {githubRepos.length > 1 && (
              <Select
                value={`${readmeRepo?.owner}/${readmeRepo?.repo}`}
                onValueChange={(v) => {
                  if (!v) return;
                  const [o, r] = v.split('/');
                  setReadmeRepo({ owner: o, repo: r });
                }}
              >
                <SelectTrigger className="h-7 w-auto text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {githubRepos.map((r) => (
                    <SelectItem key={`${r.owner}/${r.repo}`} value={`${r.owner}/${r.repo}`}>
                      {r.owner}/{r.repo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="prose prose-sm max-w-none text-secondary">
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-secondary font-sans bg-transparent border-0 p-0">
              {readme}
            </pre>
          </div>
        </div>
      )}

      {/* Data tabs */}
      {data.repoCount > 0 && (
        <>
          <Tabs value={activeTab} onValueChange={(v) => v && setActiveTab(v)}>
            <TabsList variant="line">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="commits">Commits ({allCommits.length})</TabsTrigger>
              <TabsTrigger value="prs">Pull Requests ({allPRs.length})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-4">
            {activeTab === 'overview' && <OverviewTab syncs={data.syncs} summaries={summaries} />}
            {activeTab === 'commits' && <CommitsTab commits={allCommits} />}
            {activeTab === 'prs' && <PRsTab prs={allPRs} />}
          </div>
        </>
      )}
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
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">AI Summaries</h3>
          {summaries.slice(0, 5).map((sync) => (
            <div key={sync.id} className="rounded-lg border border-subtle bg-surface p-4">
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
        <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Sync History</h3>
        {syncs.map((sync) => (
          <div key={sync.id} className="flex items-center justify-between rounded-lg border border-subtle bg-surface px-4 py-3">
            <div className="flex items-center gap-3">
              <CheckCircle size={16} weight="fill" className="text-[var(--color-success)]" />
              <div>
                <p className="text-sm font-medium text-primary">
                  {sync.commits.length} commit{sync.commits.length !== 1 ? 's' : ''}
                  {sync.pullRequests.length > 0 && `, ${sync.pullRequests.length} PR${sync.pullRequests.length !== 1 ? 's' : ''}`}
                </p>
                {sync.summary && <p className="mt-0.5 text-xs text-secondary line-clamp-1">{sync.summary}</p>}
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
      {commits.slice(0, 50).map((commit, i) => (
        <div key={`${commit.sha}-${i}`} className="flex items-start gap-3 px-4 py-3">
          <GitCommit size={16} className="mt-0.5 shrink-0 text-[var(--color-text-muted)]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary truncate">{commit.message.split('\n')[0]}</p>
            <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
              <span>{commit.author}</span>
              <span className="font-mono">{commit.sha.slice(0, 7)}</span>
              <span>{commit.repo}</span>
              <span>{formatDistanceToNow(new Date(commit.date), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      ))}
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
