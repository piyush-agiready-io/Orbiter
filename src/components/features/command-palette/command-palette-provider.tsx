'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CommandPalette } from './command-palette';
import type { SearchItem } from './command-palette';
import { useProjects } from '@/hooks/queries/use-projects';

// Quick actions always available
function useQuickActions(): SearchItem[] {
  const router = useRouter();

  return [
    {
      id: 'action-create-task',
      type: 'action',
      title: 'Create Task',
      shortcut: 'C',
      action: () => {
        // Dispatch custom event to trigger create task modal
        window.dispatchEvent(new CustomEvent('orbiter:create-task'));
      },
    },
    {
      id: 'action-close-sprint',
      type: 'action',
      title: 'Close Sprint',
      action: () => router.push('/sprints'),
    },
    {
      id: 'action-invite-user',
      type: 'action',
      title: 'Invite User',
      action: () => router.push('/admin/users'),
    },
    {
      id: 'action-settings',
      type: 'action',
      title: 'Go to Settings',
      action: () => router.push('/settings'),
    },
    {
      id: 'action-my-work',
      type: 'action',
      title: 'Go to My Work',
      action: () => router.push('/my-work'),
    },
  ];
}

interface ProjectData {
  _id: string;
  name: string;
  description?: string;
  slug: string;
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: projectsRaw } = useProjects();
  const quickActions = useQuickActions();

  // Cast projects data — the API returns an array of project objects
  const projects = (Array.isArray(projectsRaw) ? projectsRaw : []) as ProjectData[];

  // Build searchable items from loaded data
  const items: SearchItem[] = [
    ...quickActions,
    ...projects.map((p) => ({
      id: p._id,
      type: 'project' as const,
      title: p.name,
      subtitle: p.description ?? '',
      href: `/projects/${p._id}/board`,
    })),
  ];

  // Global keyboard listener + custom-event opener (clicked from sidebar)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }
    function handleOpen() {
      setIsOpen(true);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('orbiter:open-command-palette', handleOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('orbiter:open-command-palette', handleOpen);
    };
  }, []);

  const handleClose = useCallback(() => setIsOpen(false), []);

  return (
    <>
      {children}
      <CommandPalette isOpen={isOpen} onClose={handleClose} items={items} />
    </>
  );
}
