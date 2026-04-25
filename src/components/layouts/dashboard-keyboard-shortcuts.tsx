'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { KeyboardShortcutsOverlay } from '@/components/layouts/keyboard-shortcuts-overlay';

/** Mounts global keyboard shortcuts for the dashboard and renders the cheat-sheet overlay. */
export function DashboardKeyboardShortcuts() {
  const router = useRouter();

  const handlers = useMemo(
    () => ({
      onNavigateBoard: () => {
        const match = window.location.pathname.match(/\/projects\/([^/]+)/);
        if (match) router.push(`/projects/${match[1]}/board`);
      },
      onNavigateTable: () => {
        const match = window.location.pathname.match(/\/projects\/([^/]+)/);
        if (match) router.push(`/projects/${match[1]}/table`);
      },
      onCreateTask: () => {
        window.dispatchEvent(new CustomEvent('orbiter:create-task'));
      },
      onFocusSearch: () => {
        document.querySelector<HTMLInputElement>('[data-search-input]')?.focus();
      },
      onClosePanel: () => {
        window.dispatchEvent(new CustomEvent('orbiter:close-panel'));
      },
    }),
    [router],
  );

  const { showCheatSheet, setShowCheatSheet } = useDashboardKeyboardShortcuts(handlers);

  return (
    <KeyboardShortcutsOverlay
      isOpen={showCheatSheet}
      onClose={() => setShowCheatSheet(false)}
    />
  );
}
