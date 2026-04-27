import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import type { ISprint } from '@/modules/sprints/sprint.types';

export function useSprints(projectId: string, filters?: Record<string, string>) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['sprints', projectId, filters],
    queryFn: () =>
      api.get<{ sprints: ISprint[]; page: number; limit: number; total: number }>(
        `/projects/${projectId}/sprints`,
        filters,
      ),
    enabled: isAuthenticated && !!projectId,
  });
}

export function useSprint(sprintId: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['sprint', sprintId],
    queryFn: () => api.get<ISprint>(`/sprints/${sprintId}`),
    enabled: isAuthenticated && !!sprintId,
  });
}

const ALL = { refetchType: 'all' as const };

export function useCreateSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; goal?: string; startDate: string; endDate: string }) =>
      api.post(`/projects/${projectId}/sprints`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId], ...ALL });
      queryClient.invalidateQueries({ queryKey: ['timeline', projectId], ...ALL });
    },
  });
}

export function useUpdateSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId, data }: { sprintId: string; data: Record<string, unknown> }) =>
      api.patch(`/sprints/${sprintId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId], ...ALL });
      queryClient.invalidateQueries({ queryKey: ['timeline', projectId], ...ALL });
    },
  });
}

export function useCloseSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId, data }: { sprintId: string; data: { retroNotes?: string; rolloverTaskIds?: string[] } }) =>
      api.post(`/sprints/${sprintId}/close`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId], ...ALL });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId], ...ALL });
      queryClient.invalidateQueries({ queryKey: ['timeline', projectId], ...ALL });
    },
  });
}

export function useDeleteSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) => api.delete(`/sprints/${sprintId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId], ...ALL });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId], ...ALL });
      queryClient.invalidateQueries({ queryKey: ['timeline', projectId], ...ALL });
    },
  });
}

export function useSprintTasks(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId, taskIds, action }: { sprintId: string; taskIds: string[]; action: 'add' | 'remove' }) =>
      action === 'add'
        ? api.post(`/sprints/${sprintId}/tasks`, { taskIds })
        : api.delete(`/sprints/${sprintId}/tasks`, { taskIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId], ...ALL });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId], ...ALL });
      queryClient.invalidateQueries({ queryKey: ['timeline', projectId], ...ALL });
    },
  });
}
