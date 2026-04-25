import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

export function useComments(
  projectId: string,
  parentType: 'bug' | 'task',
  parentId: string,
  query?: Record<string, string>,
) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const path =
    parentType === 'bug'
      ? `/projects/${projectId}/bugs/${parentId}/comments`
      : `/projects/${projectId}/tasks/${parentId}/comments`;

  return useQuery({
    queryKey: ['comments', parentType, parentId, query],
    queryFn: () => api.get(path, query),
    enabled: isAuthenticated && !!projectId && !!parentId,
  });
}

export function useCreateComment(
  projectId: string,
  parentType: 'bug' | 'task',
  parentId: string,
) {
  const queryClient = useQueryClient();
  const path =
    parentType === 'bug'
      ? `/projects/${projectId}/bugs/${parentId}/comments`
      : `/projects/${projectId}/tasks/${parentId}/comments`;

  return useMutation({
    mutationFn: (data: { content: string; mentions: string[] }) =>
      api.post(path, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', parentType, parentId] });
    },
  });
}

export function useDeleteComment(parentType: 'bug' | 'task', parentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => api.delete(`/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', parentType, parentId] });
    },
  });
}
