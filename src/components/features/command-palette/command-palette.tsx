'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlass } from '@phosphor-icons/react';
import Fuse from 'fuse.js';
import { useRouter } from 'next/navigation';
import { CommandPaletteResult } from './command-palette-result';

export interface SearchItem {
  id: string;
  type: 'project' | 'task' | 'bug' | 'doc' | 'action';
  title: string;
  subtitle?: string;
  href?: string;
  shortcut?: string;
  action?: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: SearchItem[];
}

const GROUP_ORDER: SearchItem['type'][] = ['action', 'project', 'task', 'bug', 'doc'];

const GROUP_LABELS: Record<SearchItem['type'], string> = {
  action: 'Actions',
  project: 'Projects',
  task: 'Tasks',
  bug: 'Bugs',
  doc: 'Docs',
};

export function CommandPalette({ isOpen, onClose, items }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ['title', 'subtitle'],
        threshold: 0.4,
        includeScore: true,
      }),
    [items],
  );

  const results = useMemo(() => {
    if (!query.trim()) {
      // Show quick actions first, then recent items
      return items.filter((i) => i.type === 'action').slice(0, 5);
    }
    return fuse.search(query).map((r) => r.item).slice(0, 10);
  }, [query, fuse, items]);

  // Group results by type for display
  const groupedResults = useMemo(() => {
    const groups: { type: SearchItem['type']; label: string; items: SearchItem[] }[] = [];
    for (const type of GROUP_ORDER) {
      const groupItems = results.filter((r) => r.type === type);
      if (groupItems.length > 0) {
        groups.push({ type, label: GROUP_LABELS[type], items: groupItems });
      }
    }
    return groups;
  }, [results]);

  // Flat list for keyboard navigation
  const flatResults = useMemo(
    () => groupedResults.flatMap((g) => g.items),
    [groupedResults],
  );

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: reset state when palette opens
      setQuery('');
      setSelectedIndex(0);
      // Small delay for animation to start before focusing
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (item: SearchItem) => {
      onClose();
      if (item.action) {
        item.action();
      } else if (item.href) {
        router.push(item.href);
      }
    },
    [onClose, router],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatResults[selectedIndex]) {
            handleSelect(flatResults[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [flatResults, selectedIndex, handleSelect, onClose],
  );

  // Reset selection when results change
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: reset index when result set changes
  useEffect(() => { setSelectedIndex(0); }, [results.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (!resultsRef.current) return;
    const selected = resultsRef.current.querySelector('[data-selected="true"]');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Build a map from item id to flat index for keyboard navigation
  const itemIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const group of groupedResults) {
      for (const item of group.items) {
        map.set(item.id, idx++);
      }
    }
    return map;
  }, [groupedResults]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[100] bg-overlay"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{
              duration: 0.2,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="fixed left-1/2 top-[38%] z-[101] w-full max-w-lg -translate-x-1/2 -translate-y-1/2"
          >
            <div
              className="overflow-hidden rounded-xl border border-border-subtle bg-elevated shadow-lg"
              onKeyDown={handleKeyDown}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-border-subtle px-4">
                <MagnifyingGlass size={18} className="text-muted" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search or jump to..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-12 flex-1 bg-transparent text-base text-primary placeholder:text-muted focus:outline-none"
                />
                <kbd className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-muted">
                  esc
                </kbd>
              </div>

              {/* Results */}
              <div ref={resultsRef} className="max-h-[300px] overflow-y-auto p-2">
                {flatResults.length === 0 && query.trim() && (
                  <p className="px-3 py-6 text-center text-sm text-muted">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                )}

                {groupedResults.map((group) => (
                  <div key={group.type} className="mb-1">
                    <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted">
                      {group.label}
                    </p>
                    {group.items.map((item) => {
                      const currentIndex = itemIndexMap.get(item.id) ?? 0;
                      return (
                        <div
                          key={item.id}
                          data-selected={currentIndex === selectedIndex}
                        >
                          <CommandPaletteResult
                            type={item.type}
                            title={item.title}
                            subtitle={item.subtitle}
                            shortcut={item.shortcut}
                            isSelected={currentIndex === selectedIndex}
                            onClick={() => handleSelect(item)}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 border-t border-border-subtle px-4 py-2">
                <span className="flex items-center gap-1 text-xs text-muted">
                  <kbd className="rounded-sm border border-border-subtle bg-subtle px-1 font-mono text-xs">
                    &uarr;&darr;
                  </kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1 text-xs text-muted">
                  <kbd className="rounded-sm border border-border-subtle bg-subtle px-1 font-mono text-xs">
                    &crarr;
                  </kbd>
                  Open
                </span>
                <span className="flex items-center gap-1 text-xs text-muted">
                  <kbd className="rounded-sm border border-border-subtle bg-subtle px-1 font-mono text-xs">
                    esc
                  </kbd>
                  Close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
