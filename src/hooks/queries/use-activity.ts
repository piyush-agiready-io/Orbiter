import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

interface ActivityItem {
  id: string;
  actor: { name: string; email: string };
  action: string;
  targetType: string;
  targetId?: string;
  targetTitle?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

interface ActivityResponse {
  activities: ActivityItem[];
  page: number;
  limit: number;
  total: number;
}

export function useProjectActivity(projectId: string, page = 1) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['activity', projectId, page],
    queryFn: () =>
      api.get<ActivityResponse>(`/projects/${projectId}/activity`, {
        page: String(page),
        limit: '20',
      }),
    enabled: isAuthenticated && !!projectId,
    staleTime: 15_000,
  });
}
