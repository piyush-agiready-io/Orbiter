import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

interface OpenAIConnectionStatus {
  connected: boolean;
  authMethod?: 'oauth-device' | 'manual';
  email?: string;
  planType?: string;
  tokenExpiresAt?: string;
}

interface DeviceCodeResponse {
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
  interval: number;
}

interface PollResponse {
  authorized: boolean;
  email?: string;
  planType?: string;
}

export function useOpenAIConnectionStatus() {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['openai-connection-status'],
    queryFn: () => api.get<OpenAIConnectionStatus>('/auth/openai/status'),
    enabled: isAuthenticated,
  });
}

export function useInitiateConnection() {
  return useMutation({
    mutationFn: (data: { mode: 'device-code' | 'manual'; apiKey?: string }) =>
      api.post<DeviceCodeResponse>('/auth/openai', data),
  });
}

export function usePollConnection() {
  return useMutation({
    mutationFn: () => api.post<PollResponse>('/auth/openai/poll'),
  });
}

export function useDisconnectOpenAI() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/openai/disconnect'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openai-connection-status'] });
    },
  });
}
