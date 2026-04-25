'use client';

import { useParams } from 'next/navigation';
import { TimelineChart } from '@/components/features/timeline/timeline-chart';
import { useSprints } from '@/hooks/queries/use-sprints';

export default function TimelinePage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const { data: sprintsData, isLoading } = useSprints(projectId);

  const sprints = (sprintsData?.sprints ?? []).map((s) => ({
    _id: s.id,
    name: s.name,
    startDate: new Date(s.startDate).toISOString(),
    endDate: new Date(s.endDate).toISOString(),
  }));

  return (
    <div className="h-full overflow-auto p-6">
      <TimelineChart sprints={sprints} isLoading={isLoading} />
    </div>
  );
}
