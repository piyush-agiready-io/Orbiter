import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

export function useDocs(projectId: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['docs', projectId],
    queryFn: () => api.get(`/projects/${projectId}/docs`),
    enabled: isAuthenticated && !!projectId,
  });
}

export function useDoc(docId: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['doc', docId],
    queryFn: () => api.get(`/docs/${docId}`),
    enabled: isAuthenticated && !!docId,
  });
}

export function useSearchDocs(projectId: string, q: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['docs', projectId, 'search', q],
    queryFn: () => api.get(`/projects/${projectId}/docs/search`, { q }),
    enabled: isAuthenticated && q.length > 0,
  });
}

export function useCreateDoc(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; content?: Record<string, unknown>; contentPlaintext?: string }) =>
      api.post(`/projects/${projectId}/docs`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs', projectId] });
    },
  });
}

export function useUpdateDoc(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, data }: { docId: string; data: Record<string, unknown> }) =>
      api.patch(`/docs/${docId}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['docs', projectId] });
      queryClient.invalidateQueries({ queryKey: ['doc', variables.docId] });
    },
  });
}

export function useDeleteDoc(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => api.delete(`/docs/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs', projectId] });
    },
  });
}
