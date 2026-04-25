'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CaretDown } from '@phosphor-icons/react';
import { MyWorkTaskRow, type MyWorkTask } from './my-work-task-row';

type GroupName = 'Overdue' | 'Today' | 'This Sprint' | 'Upcoming';

const GROUP_LABEL_COLORS: Record<GroupName, string> = {
  Overdue: 'text-[var(--color-error)]',
  Today: 'text-[var(--color-text-primary)]',
  'This Sprint': 'text-[var(--color-accent)]',
  Upcoming: 'text-secondary',
};

interface MyWorkGroupProps {
  name: GroupName;
  tasks: MyWorkTask[];
}

export function MyWorkGroup({ name, tasks }: MyWorkGroupProps) {
  const [isOpen, setIsOpen] = useState(true);
  const labelColor = GROUP_LABEL_COLORS[name];

  if (tasks.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="mb-2 flex w-full items-center justify-between rounded-md px-1 py-0.5 text-sm font-medium transition-colors duration-[80ms] hover:bg-subtle"
      >
        <span className={`flex items-center gap-2 ${labelColor}`}>
          <motion.span
            animate={{ rotate: isOpen ? 0 : -90 }}
            transition={{ duration: 0.15 }}
            className="inline-flex"
          >
            <CaretDown size={14} weight="bold" />
          </motion.span>
          {name}
        </span>

        {/* Count badge */}
        <span className="rounded-full bg-subtle px-1.5 text-xs text-secondary">
          {tasks.length}
        </span>
      </button>

      {/* Collapsible task list */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden rounded-md border border-subtle"
          >
            {tasks.map((task) => (
              <MyWorkTaskRow key={task.id} task={task} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
