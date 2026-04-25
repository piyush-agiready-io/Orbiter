'use client';

import { Crosshair, DotsThree } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEpics, useDeleteEpic } from '@/hooks/queries/use-epics';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const STATUS_STYLES: Record<string, string> = {
  planning: 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]',
  active: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]',
  done: 'bg-[var(--color-success-muted)] text-[var(--color-success)]',
};

interface EpicListProps {
  projectId: string;
  onEdit: (epicId: string) => void;
  onCreate: () => void;
}

export function EpicList({ projectId, onEdit, onCreate }: EpicListProps) {
  const { data, isLoading } = useEpics(projectId);
  const deleteEpic = useDeleteEpic(projectId);

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  const epics = data?.epics ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-primary">Epics</h2>
        <Button size="sm" onClick={onCreate}>New Epic</Button>
      </div>

      {epics.length === 0 ? (
        <div className="py-12 text-center">
          <Crosshair size={32} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-muted)]">No epics yet</p>
          <Button size="sm" variant="ghost" className="mt-2" onClick={onCreate}>Create your first epic</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {epics.map((epic) => (
            <div
              key={epic.id}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-surface px-4 py-3 card-hover cursor-pointer"
              onClick={() => onEdit(epic.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Badge className={STATUS_STYLES[epic.status]}>{epic.status}</Badge>
                <span className="text-sm font-medium text-primary truncate">{epic.title}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: `${epic.progress}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--color-text-muted)] w-8 text-right">{epic.progress}%</span>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-subtle"
                  >
                    <DotsThree size={18} weight="bold" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(epic.id)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-[var(--color-error)]"
                      onClick={() => deleteEpic.mutate(epic.id)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
