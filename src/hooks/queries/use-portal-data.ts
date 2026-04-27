import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

export interface PortalOverview {
  progress: {
    total: number;
    done: number;
    inProgress: number;
    backlog: number;
    percentage: number;
  };
  activeSprint: {
    id: string;
    name: string;
    goal?: string;
    startDate: string;
    endDate: string;
    progress: { total: number; done: number; percentage: number } | null;
  } | null;
  bugs: { open: number };
  recentActivity: Array<{
    id: string;
    action: string;
    actorName: string;
    targetTitle?: string;
    targetType: string;
    meta?: Record<string, unknown>;
    createdAt: string;
  }>;
}

export interface PortalBug {
  id: string;
  title: string;
  description?: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  metadata?: { url?: string };
  createdAt: string;
}

export function usePortalProjects() {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['portal', 'projects'],
    queryFn: () => api.get('/portal/projects'),
    enabled: isAuthenticated,
  });
}

export function usePortalProject(id: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['portal', 'projects', id],
    queryFn: () => api.get(`/portal/projects/${id}`),
    enabled: isAuthenticated && !!id,
  });
}

export function usePortalTasks(projectId: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['portal', 'tasks', projectId],
    queryFn: () => api.get(`/portal/projects/${projectId}/tasks`),
    enabled: isAuthenticated && !!projectId,
  });
}

export function usePortalOverview(projectId: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['portal', 'overview', projectId],
    queryFn: () => api.get<PortalOverview>(`/portal/projects/${projectId}/overview`),
    enabled: isAuthenticated && !!projectId,
    staleTime: 30 * 1000,
  });
}

export function usePortalBugs(projectId: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['portal', 'bugs', projectId],
    queryFn: () =>
      api.get<{ bugs: PortalBug[]; total: number }>(
        `/portal/projects/${projectId}/bugs`,
      ),
    enabled: isAuthenticated && !!projectId,
  });
}

export function useReportPortalBug(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      priority: 'P0' | 'P1' | 'P2' | 'P3';
      metadata?: Record<string, unknown>;
    }) =>
      api.post<PortalBug>(`/portal/projects/${projectId}/bugs`, {
        ...data,
        source: 'manual',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'bugs', projectId] });
      queryClient.invalidateQueries({ queryKey: ['portal', 'overview', projectId] });
    },
  });
}

export function usePortalLinks(projectId: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['portal', 'links', projectId],
    queryFn: () => api.get(`/portal/projects/${projectId}/links`),
    enabled: isAuthenticated && !!projectId,
  });
}
