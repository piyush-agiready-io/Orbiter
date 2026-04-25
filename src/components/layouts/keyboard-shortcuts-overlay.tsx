'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from '@phosphor-icons/react';

interface KeyboardShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  {
    section: 'Navigation',
    items: [
      { keys: ['B'], description: 'Open Board view' },
      { keys: ['T'], description: 'Open Table view' },
      { keys: ['Cmd', 'K'], description: 'Open command palette' },
      { keys: ['/'], description: 'Focus search' },
    ],
  },
  {
    section: 'Actions',
    items: [
      { keys: ['C'], description: 'Create task' },
      { keys: ['Esc'], description: 'Close panel / modal' },
    ],
  },
  {
    section: 'General',
    items: [
      { keys: ['?'], description: 'Show this cheat sheet' },
    ],
  },
] as const;

export function KeyboardShortcutsOverlay({ isOpen, onClose }: KeyboardShortcutsOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="kbd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[100] bg-overlay"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="kbd-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 z-[101] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-subtle bg-elevated p-6 shadow-lg"
          >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-primary">
                Keyboard Shortcuts
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close keyboard shortcuts"
                className="rounded-md p-1 text-[var(--color-text-muted)] transition-colors duration-[120ms] hover:bg-subtle"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sections */}
            <div className="space-y-5">
              {SHORTCUTS.map((section) => (
                <div key={section.section}>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                    {section.section}
                  </h3>
                  <div className="space-y-1.5">
                    {section.items.map((item) => (
                      <div
                        key={item.description}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-sm text-secondary">
                          {item.description}
                        </span>
                        <div className="flex gap-1">
                          {item.keys.map((key) => (
                            <kbd
                              key={key}
                              className="inline-flex min-w-6 items-center justify-center rounded-sm border border-subtle bg-subtle px-2 py-0.5 font-mono text-xs text-[var(--color-text-muted)]"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
