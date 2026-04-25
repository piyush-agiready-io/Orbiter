'use client';

import { useParams } from 'next/navigation';
import { TimelineChart } from '@/components/features/timeline/timeline-chart';

export default function PortalTimelinePage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="p-6">
      <TimelineChart sprints={[]} isLoading={false} />
      <p className="mt-4 text-center text-sm text-secondary">
        Project: {params.id}
      </p>
    </div>
  );
}
