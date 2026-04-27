import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

const ALL = { refetchType: 'all' as const };

export function useBugs(projectId: string, filters?: Record<string, string>) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['bugs', projectId, filters],
    queryFn: () => api.get(`/projects/${projectId}/bugs`, filters),
    enabled: isAuthenticated && !!projectId,
  });
}

export function useBug(bugId: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['bug', bugId],
    queryFn: () => api.get(`/bugs/${bugId}`),
    enabled: isAuthenticated && !!bugId,
  });
}

export function useCreateBug(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      priority?: string;
      source?: string;
      metadata?: Record<string, unknown>;
    }) => api.post(`/projects/${projectId}/bugs`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs', projectId], ...ALL });
    },
  });
}

export function useUpdateBug(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bugId, data }: { bugId: string; data: Record<string, unknown> }) =>
      api.patch(`/bugs/${bugId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs', projectId], ...ALL });
      queryClient.invalidateQueries({ queryKey: ['bug'], ...ALL });
    },
  });
}

export function useDeleteBug(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bugId: string) => api.delete(`/bugs/${bugId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs', projectId], ...ALL });
    },
  });
}

export function useLinkBug(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bugId, taskId }: { bugId: string; taskId: string | null }) =>
      api.patch(`/bugs/${bugId}/link`, { taskId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs', projectId], ...ALL });
      queryClient.invalidateQueries({ queryKey: ['bug'], ...ALL });
    },
  });
}

export function useConvertBugToTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bugId: string) =>
      api.post<{ taskId: string; projectId: string }>(
        `/bugs/${bugId}/convert-to-task`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs', projectId], ...ALL });
      queryClient.invalidateQueries({ queryKey: ['bug'], ...ALL });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId], ...ALL });
      queryClient.invalidateQueries({ queryKey: ['timeline', projectId], ...ALL });
    },
  });
}
