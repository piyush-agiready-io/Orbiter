import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import type { IEpic } from '@/modules/epics/epic.types';

export function useEpics(projectId: string, filters?: Record<string, string>) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['epics', projectId, filters],
    queryFn: () =>
      api.get<{ epics: IEpic[]; page: number; limit: number; total: number }>(
        `/projects/${projectId}/epics`,
        filters,
      ),
    enabled: isAuthenticated && !!projectId,
  });
}

export function useEpic(epicId: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['epic', epicId],
    queryFn: () => api.get<IEpic>(`/epics/${epicId}`),
    enabled: isAuthenticated && !!epicId,
  });
}

export function useCreateEpic(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; status?: string; startDate?: string; endDate?: string }) =>
      api.post(`/projects/${projectId}/epics`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics', projectId] });
    },
  });
}

export function useUpdateEpic(epicId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.patch(`/epics/${epicId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics', projectId] });
      queryClient.invalidateQueries({ queryKey: ['epic', epicId] });
    },
  });
}

export function useDeleteEpic(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (epicId: string) => api.delete(`/epics/${epicId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics', projectId] });
    },
  });
}
