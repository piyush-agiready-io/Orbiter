import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import type { ITask } from '@/modules/tasks/task.types';

export function useTasks(projectId: string, filters?: Record<string, string>) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['tasks', projectId, filters],
    queryFn: () =>
      api.get<{ tasks: ITask[]; page: number; limit: number; total: number }>(
        `/projects/${projectId}/tasks`,
        filters,
      ),
    enabled: isAuthenticated && !!projectId,
  });
}

export function useTask(taskId: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: () => api.get<ITask>(`/tasks/${taskId}`),
    enabled: isAuthenticated && !!taskId,
  });
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post(`/projects/${projectId}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Record<string, unknown> }) =>
      api.patch(`/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}

export function useUpdateTaskStatus(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status, order }: { taskId: string; status: string; order?: number }) =>
      api.patch(`/tasks/${taskId}/status`, { status, order }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}

export function useBulkUpdateTasks(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { taskIds: string[]; update: Record<string, unknown> }) =>
      api.patch('/tasks/bulk', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.delete(`/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}
