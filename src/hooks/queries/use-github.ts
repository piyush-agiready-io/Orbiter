import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  repo: string;
  branch: string;
  date: string;
}

interface GitHubPR {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  repo: string;
  url: string;
  createdAt: string;
  mergedAt?: string;
  additions: number;
  deletions: number;
}

interface SyncRecord {
  id: string;
  commits: GitHubCommit[];
  pullRequests: GitHubPR[];
  summary?: string;
  lastSyncAt: string;
  createdAt: string;
}

interface GitHubData {
  syncs: SyncRecord[];
  lastSyncAt: string | null;
  repoCount: number;
  githubConnected: boolean;
  githubUsername: string | null;
}

export function useGitHubData(projectId: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['github', projectId],
    queryFn: () => api.get<GitHubData>(`/projects/${projectId}/github`),
    enabled: isAuthenticated && !!projectId,
  });
}

export function useTriggerSync(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/github`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github', projectId] });
    },
  });
}

export function useConnectGitHub(projectId: string) {
  return useMutation({
    mutationFn: () =>
      api.post<{ authUrl: string }>(`/projects/${projectId}/github/connect`),
  });
}

export function useDisconnectGitHub(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/github/disconnect`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github', projectId] });
    },
  });
}

export function useCopyGitHubConnection(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fromProjectId: string) =>
      api.post<{ copied: boolean; username: string }>(
        `/projects/${projectId}/github/copy-connection`,
        { fromProjectId },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github', projectId] });
    },
  });
}

interface GitHubRepoOption {
  owner: string;
  repo: string;
  fullName: string;
  private: boolean;
  description: string | null;
  linked: boolean;
}

export function useGitHubRepos(projectId: string, enabled = true) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['github-repos', projectId],
    queryFn: () => api.get<{ repos: GitHubRepoOption[] }>(`/projects/${projectId}/github/repos`),
    enabled: isAuthenticated && !!projectId && enabled,
  });
}

export function useGitHubReadme(projectId: string, owner: string, repo: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['github-readme', projectId, owner, repo],
    queryFn: () =>
      api.get<{ readme: string | null }>(`/projects/${projectId}/github/readme`, { owner, repo }),
    enabled: isAuthenticated && !!projectId && !!owner && !!repo,
  });
}

export type { GitHubCommit, GitHubPR, SyncRecord, GitHubData, GitHubRepoOption };
