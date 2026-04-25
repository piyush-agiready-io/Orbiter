'use client';

export function KanbanCardSkeleton() {
  return (
    <div className="relative rounded-lg border border-[var(--color-border-subtle)] bg-surface p-3 pl-4">
      {/* Priority stripe placeholder */}
      <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full skeleton" />

      {/* Title line */}
      <div className="h-4 w-3/4 rounded skeleton" />

      {/* Sprint line */}
      <div className="mt-2 h-3 w-1/3 rounded skeleton" />

      {/* Meta row */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          <div className="h-5 w-14 rounded-sm skeleton" />
          <div className="h-5 w-10 rounded-sm skeleton" />
        </div>
        <div className="h-5 w-5 rounded-full skeleton" />
      </div>
    </div>
  );
}
