'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Lightning, ArrowUp, Minus, ArrowDown, Tag } from '@phosphor-icons/react';
import Avatar from 'boring-avatars';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ITask } from '@/modules/tasks/task.types';

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  P0: <Lightning size={14} weight="fill" className="text-[var(--color-p0)]" />,
  P1: <ArrowUp size={14} weight="bold" className="text-[var(--color-p1)]" />,
  P2: <Minus size={14} className="text-[var(--color-p2)]" />,
  P3: <ArrowDown size={14} className="text-[var(--color-p3)]" />,
};

const TYPE_LABELS: Record<string, string> = {
  feature: 'Feature',
  chore: 'Chore',
  improvement: 'Improvement',
};

interface TaskCardProps {
  task: ITask;
  onClick?: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'group cursor-pointer rounded-lg border border-[var(--color-border-subtle)] bg-surface p-3',
        `priority-border-${task.priority}`,
        'card-hover',
        isDragging && 'scale-[1.02] shadow-md opacity-90',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-primary leading-snug line-clamp-2">
          {task.title}
        </p>
        {task.assignees?.[0] && typeof task.assignees[0] === 'object' && (
          <Avatar
            size={24}
            name={(task.assignees[0] as unknown as { name: string }).name}
            variant="beam"
            colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#8B8B9A', '#2E7D57']}
          />
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="flex items-center gap-1">
          {PRIORITY_ICONS[task.priority]}
        </span>
        <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
          {TYPE_LABELS[task.type]}
        </Badge>
        {task.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="outline" className="text-[11px] px-1.5 py-0">
            <Tag size={10} className="mr-0.5" />
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}
