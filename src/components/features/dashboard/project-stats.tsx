'use client';

interface ProjectStatsProps {
  taskCount: number;
  doneCount: number;
  activeCount: number;
}

export function ProjectStats({ taskCount, doneCount, activeCount }: ProjectStatsProps) {
  if (taskCount === 0) return null;
  const pct = Math.round((doneCount / taskCount) * 100);

  return (
    <div className="mt-2">
      <div className="flex h-1.5 rounded-full overflow-hidden bg-subtle">
        {doneCount > 0 && <div className="bg-[var(--color-success)]" style={{ width: `${(doneCount / taskCount) * 100}%` }} />}
        {activeCount > 0 && <div className="bg-accent" style={{ width: `${(activeCount / taskCount) * 100}%` }} />}
      </div>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{pct}% complete · {doneCount}/{taskCount} tasks</p>
    </div>
  );
}
