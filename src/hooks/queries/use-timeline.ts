import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

export interface TimelineSprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'closed';
  total: number;
  done: number;
  progress: number;
}

export interface TimelineEpic {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'done';
  progress: number;
}

export interface TimelineData {
  sprints: TimelineSprint[];
  epics: TimelineEpic[];
}

export function useTimeline(projectId: string) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['timeline', projectId],
    queryFn: () => api.get<TimelineData>(`/projects/${projectId}/timeline`),
    enabled: isAuthenticated && !!projectId,
    staleTime: 30 * 1000,
  });
}
