'use client';

import { useParams } from 'next/navigation';
import { usePortalEpics } from '@/hooks/queries/use-portal-data';
import { TimelineChart } from '@/components/features/timeline/timeline-chart';

interface EpicData {
  _id: string;
  id?: string;
  title: string;
  startDate?: string;
  endDate?: string;
  progress: number;
  status: string;
}

export default function PortalTimelinePage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = usePortalEpics(params.id);

  const rawEpics =
    (data as { epics?: EpicData[] })?.epics ??
    (Array.isArray(data) ? (data as EpicData[]) : []);

  // Normalize: ensure _id is present (TimelineChart expects _id)
  const epics = rawEpics.map((e) => ({
    ...e,
    _id: e._id ?? e.id ?? '',
  }));

  return (
    <div className="p-6">
      <TimelineChart
        epics={epics}
        sprints={[]}
        isLoading={isLoading}
      />
    </div>
  );
}
