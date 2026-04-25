'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface SprintSuggestionBannerProps {
  suggestion: {
    taskTitle: string;
    suggestedSprint?: string;
    suggestedAssignee?: string;
    reason: string;
  };
  onAccept: () => void;
  onDismiss: () => void;
}

export function SprintSuggestionBanner({
  suggestion,
  onAccept,
  onDismiss,
}: SprintSuggestionBannerProps) {
  const [visible, setVisible] = useState(true);

  const handleDismiss = () => {
    setVisible(false);
    // Wait for exit animation to complete before calling onDismiss
    setTimeout(onDismiss, 120);
  };

  const handleAccept = () => {
    setVisible(false);
    setTimeout(onAccept, 120);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-lg border border-accent/20 bg-accent-muted p-4"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              <Sparkle
                size={18}
                weight="fill"
                className="text-[var(--color-accent-text)]"
              />
            </div>

            <div className="flex-1 text-sm text-primary">
              <p>
                AI suggests assigning &lsquo;{suggestion.taskTitle}&rsquo;
                {suggestion.suggestedAssignee && (
                  <> to <span className="font-medium">{suggestion.suggestedAssignee}</span></>
                )}
                {suggestion.suggestedSprint && (
                  <> in <span className="font-medium">{suggestion.suggestedSprint}</span></>
                )}
                .{' '}
                <span className="text-secondary">Reason: {suggestion.reason}</span>
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={handleAccept}>
                Accept
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDismiss}>
                Dismiss
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
