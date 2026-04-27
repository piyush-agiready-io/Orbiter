'use client';

import { useParams } from 'next/navigation';
import { TimelineChart } from '@/components/features/timeline/timeline-chart';
import { useTimeline } from '@/hooks/queries/use-timeline';

export default function TimelinePage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useTimeline(params.id);

  return (
    <div className="h-full overflow-auto p-6">
      <TimelineChart
        sprints={data?.sprints ?? []}
        epics={data?.epics ?? []}
        isLoading={isLoading}
      />
    </div>
  );
}
