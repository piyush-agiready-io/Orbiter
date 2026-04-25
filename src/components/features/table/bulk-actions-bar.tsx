'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BulkActionsBarProps {
  selectedCount: number;
  onStatusChange: (status: string | null) => void;
  onDelete: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onStatusChange,
  onDelete,
}: BulkActionsBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-lg border border-subtle bg-elevated px-4 py-2 shadow-lg">
            <span className="text-sm font-medium text-primary">
              {selectedCount} selected
            </span>

            <div className="h-4 w-px bg-subtle" />

            <Select onValueChange={onStatusChange}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue placeholder="Change Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="todo">Todo</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
            >
              <Trash size={14} data-icon="inline-start" />
              Delete
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
