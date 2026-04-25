'use client';

import { useEffect, useState } from 'react';

export interface ShortcutConfig {
  key: string;
  handler: () => void;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  /** Allow the shortcut to fire even when focus is inside an input/textarea/select/contenteditable */
  allowInInput?: boolean;
}

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Low-level hook: register an arbitrary list of keyboard shortcuts.
 * The hook re-registers whenever the `shortcuts` array reference changes,
 * so callers should stabilise the array with useMemo / useCallback.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput =
        INPUT_TAGS.has(target.tagName) || target.isContentEditable;

      for (const shortcut of shortcuts) {
        if (isInput && !shortcut.allowInInput) continue;
        if (shortcut.ctrl && !e.ctrlKey) continue;
        if (shortcut.meta && !e.metaKey) continue;
        if (shortcut.shift && !e.shiftKey) continue;

        const keyMatches =
          e.key.toLowerCase() === shortcut.key.toLowerCase() ||
          e.key === shortcut.key;

        if (keyMatches) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Higher-level hook used by the dashboard layout.
 * Wires all app-level shortcuts and manages cheat-sheet visibility.
 *
 * Consumers pass callbacks for navigation and action shortcuts:
 *   - `onNavigateBoard`  → B
 *   - `onNavigateTable`  → T
 *   - `onCreateTask`     → C
 *   - `onFocusSearch`    → /
 *   - `onClosePanel`     → Esc
 *
 * Returns `{ showCheatSheet, setShowCheatSheet }`.
 */
export interface DashboardShortcutHandlers {
  onNavigateBoard: () => void;
  onNavigateTable: () => void;
  onCreateTask: () => void;
  onFocusSearch: () => void;
  onClosePanel: () => void;
}

export function useDashboardKeyboardShortcuts(handlers: DashboardShortcutHandlers) {
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  const shortcuts: ShortcutConfig[] = [
    { key: 'b', handler: handlers.onNavigateBoard },
    { key: 't', handler: handlers.onNavigateTable },
    { key: 'c', handler: handlers.onCreateTask },
    { key: '/', handler: handlers.onFocusSearch },
    { key: '?', handler: () => setShowCheatSheet(true) },
    {
      key: 'Escape',
      allowInInput: true,
      handler: () => {
        if (showCheatSheet) {
          setShowCheatSheet(false);
        } else {
          handlers.onClosePanel();
        }
      },
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return { showCheatSheet, setShowCheatSheet };
}
