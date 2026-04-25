'use client';

import { useParams } from 'next/navigation';
import { ActivityFeed } from '@/components/features/activity/activity-feed';

export default function ActivityPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h2 className="text-base font-semibold text-primary">Activity</h2>
      <p className="mt-1 text-sm text-secondary">
        Recent actions and updates across this project.
      </p>
      <div className="mt-4">
        <ActivityFeed projectId={params.id} />
      </div>
    </div>
  );
}
