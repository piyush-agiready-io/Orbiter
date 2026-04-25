import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

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

export function usePortalLinks(projectId: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['portal', 'links', projectId],
    queryFn: () => api.get(`/portal/projects/${projectId}/links`),
    enabled: isAuthenticated && !!projectId,
  });
}
