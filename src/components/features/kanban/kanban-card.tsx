'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import Avatar from 'boring-avatars';
import { Sparkle, DotsThree, Trash, PencilSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useDeleteTask } from '@/hooks/queries/use-tasks';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import type { ITask } from '@/modules/tasks/task.types';

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'var(--color-p0)',
  P1: 'var(--color-p1)',
  P2: 'var(--color-p2)',
  P3: 'var(--color-p3)',
};

const TYPE_LABELS: Record<string, { label: string; className: string }> = {
  feature: { label: 'Feature', className: 'bg-accent-muted text-[var(--color-accent-text)]' },
  chore: { label: 'Chore', className: 'bg-subtle text-secondary' },
  improvement: { label: 'Improvement', className: 'bg-[var(--color-info-muted)] text-[var(--color-info)]' },
};

const SOURCE_INDICATOR: Record<string, { icon: boolean; label: string; className: string }> = {
  ai: { icon: true, label: 'AI', className: 'text-[var(--color-accent)]' },
  keyword: { icon: false, label: 'Auto', className: 'text-[var(--color-warning)]' },
};

interface KanbanCardProps {
  task: ITask;
  projectId: string;
  onClick?: (task: ITask) => void;
}

export function KanbanCard({ task, projectId, onClick }: KanbanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteTask = useDeleteTask(projectId);

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

  const priorityColor = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.P3;

  return (
    <>
      <motion.div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        data-dragging={isDragging || undefined}
        className={cn(
          'group relative cursor-grab rounded-lg border border-[var(--color-border-subtle)] bg-surface shadow-xs',
          'transition-all duration-[120ms] ease-linear',
          isDragging
            ? 'z-50 opacity-0 pointer-events-none'
            : 'hover:-translate-y-px hover:shadow-sm',
        )}
        onClick={() => onClick?.(task)}
        layout
      >
        {/* Priority left-border stripe */}
        <div
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
          style={{ backgroundColor: priorityColor }}
        />

        {/* Three-dot menu */}
        <button
          type="button"
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 hover:bg-subtle"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
        >
          <DotsThree size={16} weight="bold" className="text-[var(--color-text-muted)]" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
            <div className="absolute right-1 top-8 z-50 w-36 rounded-lg border border-subtle bg-surface py-1 shadow-md">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-subtle"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onClick?.(task); }}
              >
                <PencilSimple size={14} /> Edit task
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--color-error)] transition-colors hover:bg-subtle"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setDeleteOpen(true); }}
              >
                <Trash size={14} /> Delete task
              </button>
            </div>
          </>
        )}

        <div className="px-3 py-2.5 pl-4">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="rounded-sm px-1 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${priorityColor} 15%, transparent)`, color: priorityColor }}>
              {task.priority}
            </span>
            {task.prioritySource && SOURCE_INDICATOR[task.prioritySource] && (
              <span className={cn('flex items-center gap-0.5 text-[10px] font-medium', SOURCE_INDICATOR[task.prioritySource].className)}>
                {SOURCE_INDICATOR[task.prioritySource].icon && <Sparkle size={10} weight="fill" />}
                {SOURCE_INDICATOR[task.prioritySource].label}
              </span>
            )}
          </div>

          <p className="text-[13px] font-medium leading-snug text-primary line-clamp-2 pr-5">
            {task.title}
          </p>

          {task.sprint && (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {typeof task.sprint === 'string' ? task.sprint : (task.sprint as unknown as { name: string }).name}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {TYPE_LABELS[task.type] && (
                <span className={cn('rounded-sm px-1.5 py-0.5 text-xs font-medium', TYPE_LABELS[task.type].className)}>
                  {TYPE_LABELS[task.type].label}
                </span>
              )}
              {task.tags?.slice(0, 2).map((tag) => (
                <span key={tag} className="rounded-sm bg-subtle px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]">
                  {tag}
                </span>
              ))}
            </div>
            {task.assignee && (
              <Avatar
                size={20}
                name={typeof task.assignee === 'string' ? task.assignee : (task.assignee as unknown as { name: string }).name}
                variant="beam"
                colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']}
              />
            )}
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete task"
        description={`"${task.title}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteTask.mutate(task.id)}
        loading={deleteTask.isPending}
      />
    </>
  );
}
