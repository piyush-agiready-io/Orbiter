import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

export function useMyTasks(includeDone = false) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['my-tasks', { includeDone }],
    queryFn: () =>
      api.get('/tasks/my', includeDone ? { includeDone: 'true' } : undefined),
    enabled: isAuthenticated,
  });
}
