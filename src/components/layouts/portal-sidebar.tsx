'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SignOut } from '@phosphor-icons/react';
import { usePortalProjects } from '@/hooks/queries/use-portal-data';
import { useAuth } from '@/hooks/use-auth';

const PROJECT_DOT_COLORS = ['bg-accent', 'bg-success', 'bg-warning', 'bg-info'];

export function PortalSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = usePortalProjects();
  const { user, clearAuth } = useAuth();

  const raw = data as { projects?: { id: string; name: string }[] } | undefined;
  const projects = raw?.projects ?? [];

  function handleLogout() {
    clearAuth();
    router.push('/login');
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-subtle bg-surface p-4">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <div className="flex h-4 w-4 items-center justify-center rounded-sm bg-accent text-[10px] font-bold leading-none text-[var(--color-text-inverse)]">
          O
        </div>
        <span className="font-semibold text-primary">Orbiter</span>
        <span className="ml-auto rounded-sm bg-accent-muted px-1.5 py-0.5 text-xs font-medium text-accent">
          Client
        </span>
      </div>

      <div className="mt-6 mb-2 px-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Projects
        </h3>
      </div>
      <nav className="flex flex-col gap-0.5">
        {projects.map((project: { id: string; name: string }, index: number) => {
          const isActive = pathname.startsWith(`/portal/projects/${project.id}`);
          const dotColor = PROJECT_DOT_COLORS[index % PROJECT_DOT_COLORS.length];

          return (
            <Link
              key={project.id}
              href={`/portal/projects/${project.id}`}
              className={`flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors duration-[120ms] ease-[ease] ${
                isActive
                  ? 'bg-subtle font-medium text-primary'
                  : 'text-secondary hover:bg-subtle hover:text-primary'
              }`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
              <span className="truncate">{project.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {user && (
        <div className="border-t border-subtle pt-3 mt-3">
          <p className="px-3 text-sm font-medium text-primary truncate">{user.name}</p>
          <p className="px-3 text-xs text-[var(--color-text-muted)] truncate">{user.email}</p>
        </div>
      )}

      <button
        onClick={handleLogout}
        className="mt-2 flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-[var(--color-error)] transition-colors duration-[120ms] ease-[ease] hover:bg-subtle"
      >
        <SignOut size={16} className="shrink-0" />
        <span>Sign Out</span>
      </button>
    </aside>
  );
}
