import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

export function useLinks(projectId: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['links', projectId],
    queryFn: () => api.get(`/projects/${projectId}/links`),
    enabled: isAuthenticated && !!projectId,
  });
}

export function useCreateLink(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { label: string; url: string; type: string }) =>
      api.post(`/projects/${projectId}/links`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', projectId] });
    },
  });
}

export function useUpdateLink(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ linkId, data }: { linkId: string; data: Record<string, unknown> }) =>
      api.patch(`/links/${linkId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', projectId] });
    },
  });
}

export function useDeleteLink(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => api.delete(`/links/${linkId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', projectId] });
    },
  });
}
