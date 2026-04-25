'use client';

import { useParams } from 'next/navigation';
import { usePortalTasks } from '@/hooks/queries/use-portal-data';
import { PortalKanbanBoard } from '@/components/features/portal/portal-kanban-board';
import type { ITask } from '@/modules/tasks/task.types';

export default function PortalBoardPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = usePortalTasks(params.id);

  const tasks: ITask[] =
    (data as { tasks?: ITask[] })?.tasks ??
    (Array.isArray(data) ? (data as ITask[]) : []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-x-auto">
        <PortalKanbanBoard tasks={tasks} isLoading={isLoading} />
      </div>
    </div>
  );
}
