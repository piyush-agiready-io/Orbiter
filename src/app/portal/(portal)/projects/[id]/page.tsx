'use client';

import { useParams } from 'next/navigation';
import { usePortalTasks } from '@/hooks/queries/use-portal-data';
import { PortalProgressCard } from '@/components/features/portal/portal-progress-card';
import type { ITask } from '@/modules/tasks/task.types';

export default function PortalProjectOverviewPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = usePortalTasks(params.id);

  const tasks: ITask[] =
    (data as { tasks?: ITask[] })?.tasks ??
    (Array.isArray(data) ? (data as ITask[]) : []);

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter(
    (t) => t.status === 'in_progress' || t.status === 'review',
  ).length;
  const backlog = tasks.filter(
    (t) => t.status === 'backlog' || t.status === 'todo',
  ).length;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-48 animate-pulse rounded-lg bg-subtle" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PortalProgressCard
        total={total}
        done={done}
        inProgress={inProgress}
        backlog={backlog}
      />
    </div>
  );
}
