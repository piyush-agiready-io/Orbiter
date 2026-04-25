'use client';

import { startOfDay } from 'date-fns';
import { useMyTasks } from '@/hooks/queries/use-my-tasks';
import { MyWorkGroup } from '@/components/features/my-work/my-work-group';
import type { MyWorkTask } from '@/components/features/my-work/my-work-task-row';
import type { TaskPriority } from '@/modules/tasks/task.types';

// Populated sprint shape returned by the API
interface PopulatedSprint {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

function groupTasks(tasks: MyWorkTask[]) {
  const today = startOfDay(new Date());

  const groups: {
    overdue: MyWorkTask[];
    today: MyWorkTask[];
    thisSprint: MyWorkTask[];
    upcoming: MyWorkTask[];
  } = { overdue: [], today: [], thisSprint: [], upcoming: [] };

  for (const task of tasks) {
    const sprint =
      task.sprint && typeof task.sprint !== 'string'
        ? (task.sprint as PopulatedSprint)
        : null;

    if (sprint?.endDate && new Date(sprint.endDate) < today) {
      groups.overdue.push(task);
    } else if (
      sprint?.startDate &&
      sprint?.endDate &&
      new Date(sprint.startDate) <= today &&
      new Date(sprint.endDate) >= today
    ) {
      groups.thisSprint.push(task);
    } else {
      groups.upcoming.push(task);
    }
  }

  // Sort each group by priority (P0 first)
  for (const group of Object.values(groups)) {
    group.sort(
      (a, b) =>
        (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3),
    );
  }

  return groups;
}

export default function MyWorkPage() {
  const { data, isLoading, error } = useMyTasks();

  const tasks = (data as MyWorkTask[] | undefined) ?? [];
  const groups = groupTasks(tasks);
  const totalTasks = tasks.length;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold tracking-tight text-primary">My Work</h1>

      {isLoading && (
        <div className="mt-8 flex items-center justify-center">
          <span className="text-sm text-secondary">Loading tasks…</span>
        </div>
      )}

      {error && (
        <div className="mt-8">
          <p className="text-sm text-[var(--color-error)]">
            Failed to load tasks. Please try again.
          </p>
        </div>
      )}

      {!isLoading && !error && totalTasks === 0 && (
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-medium text-primary">All caught up!</p>
          <p className="text-sm text-secondary">No tasks assigned to you.</p>
        </div>
      )}

      {!isLoading && !error && totalTasks > 0 && (
        <div className="mt-6">
          <MyWorkGroup name="Overdue" tasks={groups.overdue} />
          <MyWorkGroup name="Today" tasks={groups.today} />
          <MyWorkGroup name="This Sprint" tasks={groups.thisSprint} />
          <MyWorkGroup name="Upcoming" tasks={groups.upcoming} />
        </div>
      )}
    </div>
  );
}
