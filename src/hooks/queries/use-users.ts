import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

export function useUsers(filters?: Record<string, string>) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () =>
      api.get<{
        users: { id: string; name: string; email: string; role: string }[];
        page: number;
        limit: number;
        total: number;
      }>('/users', filters),
    enabled: isAuthenticated,
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      api.post<{ user: { id: string; email: string; role: string }; inviteToken: string }>(
        '/users/invite',
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
