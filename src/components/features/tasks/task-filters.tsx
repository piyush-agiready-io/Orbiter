'use client';

import { Funnel, MagnifyingGlass } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSprints } from '@/hooks/queries/use-sprints';

interface TaskFiltersProps {
  projectId: string;
  filters: Record<string, string>;
  onChange: (filters: Record<string, string>) => void;
}

export function TaskFilters({ projectId, filters, onChange }: TaskFiltersProps) {
  const { data: sprintsData } = useSprints(projectId);

  const update = (key: string, value: string) => {
    const next = { ...filters };
    if (value && value !== 'all') {
      next[key] = value;
    } else {
      delete next[key];
    }
    onChange(next);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-xs">
        <MagnifyingGlass
          size={16}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
        />
        <Input
          placeholder="Search tasks..."
          className="pl-8 h-8"
          value={filters.search ?? ''}
          onChange={(e) => update('search', e.target.value)}
        />
      </div>

      <Funnel size={16} className="text-[var(--color-text-muted)]" />

      <Select value={filters.priority ?? 'all'} onValueChange={(v) => update('priority', v ?? 'all')}>
        <SelectTrigger size="sm"><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="P0">P0 — Urgent</SelectItem>
          <SelectItem value="P1">P1 — High</SelectItem>
          <SelectItem value="P2">P2 — Medium</SelectItem>
          <SelectItem value="P3">P3 — Low</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.type ?? 'all'} onValueChange={(v) => update('type', v ?? 'all')}>
        <SelectTrigger size="sm"><SelectValue placeholder="Type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="feature">Feature</SelectItem>
          <SelectItem value="chore">Chore</SelectItem>
          <SelectItem value="improvement">Improvement</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.sprint ?? 'all'} onValueChange={(v) => update('sprint', v ?? 'all')}>
        <SelectTrigger size="sm"><SelectValue placeholder="Sprint" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sprints</SelectItem>
          {sprintsData?.sprints?.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
