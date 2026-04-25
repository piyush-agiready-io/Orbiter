'use client';

import { useParams } from 'next/navigation';
import { TimelineChart } from '@/components/features/timeline/timeline-chart';
import { useEpics } from '@/hooks/queries/use-epics';
import { useSprints } from '@/hooks/queries/use-sprints';

export default function TimelinePage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const { data: epicsData, isLoading: epicsLoading } = useEpics(projectId);
  const { data: sprintsData, isLoading: sprintsLoading } = useSprints(projectId);

  const isLoading = epicsLoading || sprintsLoading;

  const epics = (epicsData?.epics ?? []).map((e) => ({
    _id: e.id,
    title: e.title,
    startDate: e.startDate ? new Date(e.startDate).toISOString() : undefined,
    endDate: e.endDate ? new Date(e.endDate).toISOString() : undefined,
    progress: e.progress,
    status: e.status,
  }));

  const sprints = (sprintsData?.sprints ?? []).map((s) => ({
    _id: s.id,
    name: s.name,
    startDate: new Date(s.startDate).toISOString(),
    endDate: new Date(s.endDate).toISOString(),
  }));

  return (
    <div className="h-full overflow-auto p-6">
      <TimelineChart
        epics={epics}
        sprints={sprints}
        isLoading={isLoading}
      />
    </div>
  );
}
