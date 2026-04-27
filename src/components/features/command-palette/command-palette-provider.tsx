'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { CommandPalette } from './command-palette';
import type { SearchItem } from './command-palette';
import { useProjects } from '@/hooks/queries/use-projects';
import { useAuth } from '@/hooks/use-auth';

interface ProjectData {
  id: string;
  name: string;
  description?: string;
}

const PROJECT_PAGE_RE = /^\/projects\/([a-f\d]{24})/i;

function toggleTheme() {
  const root = document.documentElement;
  const wasDark = root.classList.contains('dark');
  const nextDark = !wasDark;
  root.classList.toggle('dark', nextDark);
  try {
    localStorage.setItem('orbiter-theme', nextDark ? 'dark' : 'light');
  } catch {}
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const { data: projectsData } = useProjects();
  const { user, clearAuth } = useAuth();

  // The /projects/[id]/* path segment carries the current project id; use
  // it to surface the active project's sub-pages as quick jumps.
  const currentProjectId = useMemo(() => {
    if (params?.id && /^[a-f\d]{24}$/i.test(params.id)) return params.id;
    const match = pathname?.match(PROJECT_PAGE_RE);
    return match?.[1];
  }, [params, pathname]);

  const projects = ((projectsData as { projects?: ProjectData[] })?.projects ?? []) as ProjectData[];

  const items: SearchItem[] = useMemo(() => {
    const list: SearchItem[] = [];

    // ── Global navigation actions ─────────────────────────────────────────
    list.push(
      {
        id: 'nav-home',
        type: 'action',
        title: 'Go to Home',
        subtitle: 'Project list',
        action: () => router.push('/'),
      },
      {
        id: 'nav-my-work',
        type: 'action',
        title: 'Go to My Work',
        subtitle: 'Tasks assigned to you',
        action: () => router.push('/my-work'),
      },
      {
        id: 'nav-settings',
        type: 'action',
        title: 'Go to Settings',
        action: () => router.push('/settings'),
      },
      {
        id: 'nav-chatgpt',
        type: 'action',
        title: 'Go to ChatGPT Settings',
        subtitle: 'Connect / manage AI integration',
        action: () => router.push('/settings/chatgpt'),
      },
    );

    if (user?.role === 'admin') {
      list.push({
        id: 'nav-admin',
        type: 'action',
        title: 'Go to Team',
        subtitle: 'Manage team members and invites',
        action: () => router.push('/admin'),
      });
    }

    // ── Active project sub-page jumps ─────────────────────────────────────
    if (currentProjectId) {
      const projectName = projects.find((p) => p.id === currentProjectId)?.name;
      const subtitle = projectName ?? 'Current project';
      list.push(
        {
          id: 'project-board',
          type: 'action',
          title: 'Project: Board',
          subtitle,
          action: () => router.push(`/projects/${currentProjectId}/board`),
        },
        {
          id: 'project-backlog',
          type: 'action',
          title: 'Project: Backlog',
          subtitle,
          action: () => router.push(`/projects/${currentProjectId}/backlog`),
        },
        {
          id: 'project-sprints',
          type: 'action',
          title: 'Project: Sprints',
          subtitle,
          action: () => router.push(`/projects/${currentProjectId}/sprints`),
        },
        {
          id: 'project-epics',
          type: 'action',
          title: 'Project: Epics',
          subtitle,
          action: () => router.push(`/projects/${currentProjectId}/epics`),
        },
        {
          id: 'project-bugs',
          type: 'action',
          title: 'Project: Bugs',
          subtitle,
          action: () => router.push(`/projects/${currentProjectId}/bugs`),
        },
        {
          id: 'project-docs',
          type: 'action',
          title: 'Project: Docs',
          subtitle,
          action: () => router.push(`/projects/${currentProjectId}/docs`),
        },
        {
          id: 'project-timeline',
          type: 'action',
          title: 'Project: Timeline',
          subtitle,
          action: () => router.push(`/projects/${currentProjectId}/timeline`),
        },
        {
          id: 'project-activity',
          type: 'action',
          title: 'Project: Activity',
          subtitle,
          action: () => router.push(`/projects/${currentProjectId}/activity`),
        },
        {
          id: 'project-settings',
          type: 'action',
          title: 'Project: Settings',
          subtitle,
          action: () => router.push(`/projects/${currentProjectId}/settings`),
        },
      );
    }

    // ── Utility actions ───────────────────────────────────────────────────
    list.push(
      {
        id: 'util-toggle-theme',
        type: 'action',
        title: 'Toggle theme',
        subtitle: 'Switch between light and dark',
        action: () => toggleTheme(),
      },
      {
        id: 'util-sign-out',
        type: 'action',
        title: 'Sign out',
        action: () => {
          clearAuth();
          router.push('/login');
        },
      },
    );

    // ── Projects ──────────────────────────────────────────────────────────
    for (const p of projects) {
      list.push({
        id: `project-${p.id}`,
        type: 'project',
        title: p.name,
        subtitle: p.description ?? '',
        href: `/projects/${p.id}/board`,
      });
    }

    return list;
  }, [router, user?.role, currentProjectId, projects, clearAuth]);

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
