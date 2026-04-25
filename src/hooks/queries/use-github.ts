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

export type { GitHubCommit, GitHubPR, SyncRecord, GitHubData };
