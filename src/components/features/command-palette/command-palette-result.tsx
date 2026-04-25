'use client';

import {
  File,
  Bug,
  Kanban,
  FolderSimple,
  Lightning,
} from '@phosphor-icons/react';

type ResultType = 'project' | 'task' | 'bug' | 'doc' | 'action';

interface CommandPaletteResultProps {
  type: ResultType;
  title: string;
  subtitle?: string;
  shortcut?: string;
  isSelected: boolean;
  onClick: () => void;
}

const ICONS: Record<ResultType, typeof File> = {
  project: FolderSimple,
  task: Kanban,
  bug: Bug,
  doc: File,
  action: Lightning,
};

export function CommandPaletteResult({
  type,
  title,
  subtitle,
  shortcut,
  isSelected,
  onClick,
}: CommandPaletteResultProps) {
  const Icon = ICONS[type];

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors duration-[120ms] ${
        isSelected ? 'bg-subtle' : 'hover:bg-subtle'
      }`}
    >
      <Icon
        size={18}
        weight={isSelected ? 'fill' : 'regular'}
        className={isSelected ? 'text-accent' : 'text-muted'}
      />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm text-primary">{title}</p>
        {subtitle && (
          <p className="truncate text-xs text-muted">{subtitle}</p>
        )}
      </div>
      {shortcut && (
        <kbd className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-muted">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
