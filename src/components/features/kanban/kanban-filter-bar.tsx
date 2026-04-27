'use client';

import { MagnifyingGlass, Funnel } from '@phosphor-icons/react';
import { Plus } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface TaskFilters {
  search?: string;
  priority?: string;
  assignee?: string;
  sprint?: string;
}

interface KanbanFilterBarProps {
  filters: TaskFilters;
  onFilterChange: (filters: TaskFilters) => void;
  onNewTask: () => void;
  assignees?: { id: string; name: string }[];
  sprints?: { id: string; name: string; status: string }[];
}

export function KanbanFilterBar({
  filters,
  onFilterChange,
  onNewTask,
  assignees = [],
  sprints = [],
}: KanbanFilterBarProps) {
  const updateFilter = (key: keyof TaskFilters, value: string) => {
    const next = { ...filters };
    if (value && value !== 'all') {
      next[key] = value;
    } else {
      delete next[key];
    }
    onFilterChange(next);
  };

  return (
    <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] bg-surface px-6 py-3">
      {/* Search input */}
      <div className="relative flex-1 max-w-xs">
        <MagnifyingGlass
          size={16}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
        />
        <Input
          type="text"
          placeholder="Search tasks..."
          className="pl-8 h-8"
          value={filters.search ?? ''}
          onChange={(e) => updateFilter('search', e.target.value)}
        />
      </div>

      {/* Filter icon */}
      <Funnel size={16} className="text-[var(--color-text-muted)]" />

      {/* Priority dropdown */}
      <Select
        value={filters.priority ?? 'all'}
        onValueChange={(v) => updateFilter('priority', v ?? 'all')}
      >
        <SelectTrigger size="sm">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="P0">P0 — Urgent</SelectItem>
          <SelectItem value="P1">P1 — High</SelectItem>
          <SelectItem value="P2">P2 — Medium</SelectItem>
          <SelectItem value="P3">P3 — Low</SelectItem>
        </SelectContent>
      </Select>

      {/* Assignee dropdown */}
      <Select
        value={filters.assignee ?? 'all'}
        onValueChange={(v) => updateFilter('assignee', v ?? 'all')}
      >
        <SelectTrigger size="sm">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          {assignees.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sprint dropdown */}
      {sprints.length > 0 && (
        <Select
          value={filters.sprint ?? 'all'}
          onValueChange={(v) => updateFilter('sprint', v ?? 'all')}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Sprint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sprints</SelectItem>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} {s.status === 'active' ? '(active)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* New Task button */}
      <Button size="sm" onClick={onNewTask}>
        <Plus size={14} data-icon="inline-start" />
        New Task
      </Button>
    </div>
  );
}
