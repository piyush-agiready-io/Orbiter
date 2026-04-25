import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

export function useEnvVariables(projectId: string, environment?: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['envVars', projectId, environment],
    queryFn: () =>
      api.get(`/projects/${projectId}/env`, environment ? { environment } : undefined),
    enabled: isAuthenticated && !!projectId,
  });
}

export function useRevealEnvVariable() {
  return useMutation({
    mutationFn: (envId: string) =>
      api.get<{ key: string; value: string; environment: string }>(`/env/${envId}/reveal`),
  });
}

export function useCreateEnvVariable(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { key: string; value: string; environment: string }) =>
      api.post(`/projects/${projectId}/env`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envVars', projectId] });
    },
  });
}

export function useUpdateEnvVariable(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ envId, data }: { envId: string; data: Record<string, unknown> }) =>
      api.patch(`/env/${envId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envVars', projectId] });
    },
  });
}

export function useDeleteEnvVariable(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (envId: string) => api.delete(`/env/${envId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envVars', projectId] });
    },
  });
}

export function useExportEnv(projectId: string) {
  return useMutation({
    mutationFn: (environment: string) =>
      api.get<{ content: string; environment: string }>(
        `/projects/${projectId}/env/export`,
        { environment },
      ),
  });
}

export function useEnvAuditLog(projectId: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['envAudit', projectId],
    queryFn: () => api.get(`/projects/${projectId}/env/audit`),
    enabled: isAuthenticated && !!projectId,
  });
}
