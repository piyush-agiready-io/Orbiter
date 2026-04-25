'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react';
import { useRecents } from '@/hooks/use-recents';
import { useProject } from '@/hooks/queries/use-projects';
import { useAuth } from '@/hooks/use-auth';

const TABS = [
  { label: 'Board', href: '/board' },
  { label: 'Table', href: '/table' },
  { label: 'Timeline', href: '/timeline' },
  { label: 'Backlog', href: '/backlog' },
  { label: 'Sprints', href: '/sprints' },
  { label: 'Bugs', href: '/bugs' },
  { label: 'Docs', href: '/docs' },
  { label: 'Links', href: '/links' },
  { label: 'Env', href: '/env' },
  { label: 'GitHub', href: '/github' },
  { label: 'Settings', href: '/settings', adminOnly: true },
] as const;

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const { addRecent } = useRecents();
  const { data: project } = useProject(params.id);
  const { user } = useAuth();
  const isClient = user?.role === 'client';

  useEffect(() => {
    if (params.id) {
      addRecent(params.id);
    }
  }, [params.id, addRecent]);

  const basePath = `/projects/${params.id}`;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-subtle bg-surface px-6 pt-3 pb-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] transition-colors duration-[120ms] hover:text-secondary"
          >
            <ArrowLeft size={12} />
          </Link>
          <h1 className="text-lg font-semibold tracking-tight text-primary">
            {(project as { name?: string } | undefined)?.name ?? 'Project'}
          </h1>
        </div>

        <nav className="mt-3 flex gap-1 overflow-x-auto">
          {TABS.filter((tab) => !('adminOnly' in tab && tab.adminOnly && isClient)).map((tab) => {
            const tabPath = `${basePath}${tab.href}`;
            const isActive = pathname.startsWith(tabPath);

            return (
              <Link
                key={tab.href}
                href={tabPath}
                className={`relative inline-flex shrink-0 items-center px-3 py-2 text-sm font-medium transition-colors duration-[120ms] ${
                  isActive
                    ? 'text-primary'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
