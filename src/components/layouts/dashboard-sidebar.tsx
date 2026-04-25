'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MagnifyingGlass,
  GearSix,
  UserCircle,
  Star,
  ClockCounterClockwise,
  Robot,
  UsersThree,
} from '@phosphor-icons/react';
import { useProjects } from '@/hooks/queries/use-projects';
import { useFavorites } from '@/hooks/use-favorites';
import { useRecents } from '@/hooks/use-recents';
import { useAuth } from '@/hooks/use-auth';

const PROJECT_DOT_COLORS = ['bg-accent', 'bg-success', 'bg-warning', 'bg-info'];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data } = useProjects();
  const { user } = useAuth();
  const { favoriteIds, toggleFavorite, isFavorite } = useFavorites();
  const { recentIds } = useRecents();

  const projects = (data as { projects?: { id: string; name: string }[] })?.projects ?? [];

  // Build lookup map for project names
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const favoriteProjects = favoriteIds
    .map((id) => projectMap.get(id))
    .filter((p): p is { id: string; name: string } => Boolean(p));

  const recentProjects = recentIds
    .map((id) => projectMap.get(id))
    .filter((p): p is { id: string; name: string } => Boolean(p));

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-subtle bg-surface p-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 px-3 py-1.5 transition-colors duration-[120ms] hover:opacity-80">
        <div className="flex h-4 w-4 items-center justify-center rounded-sm bg-accent text-[10px] font-bold leading-none text-[var(--color-text-inverse)]">
          O
        </div>
        <span className="font-semibold text-primary">Orbiter</span>
      </Link>

      {/* Search trigger */}
      <button
        type="button"
        className="mt-3 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-secondary transition-colors duration-[120ms] ease-[ease] hover:bg-subtle hover:text-primary"
      >
        <MagnifyingGlass size={16} className="shrink-0" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="rounded-sm border border-subtle bg-subtle px-1.5 py-0.5 text-xs text-secondary">
          Cmd+K
        </kbd>
      </button>

      {/* My Work link */}
      <div className="mt-3">
        <Link
          href="/my-work"
          className={`flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors duration-[120ms] ease-[ease] ${
            pathname === '/my-work'
              ? 'bg-muted font-medium text-primary'
              : 'text-secondary hover:bg-subtle hover:text-primary'
          }`}
        >
          <UserCircle size={16} className="shrink-0" />
          <span>My Work</span>
        </Link>
      </div>

      {/* Favorites section — only shown when there are favorites */}
      {favoriteProjects.length > 0 && (
        <>
          <div className="mt-6 mb-2 px-3">
            <h3 className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Favorites
            </h3>
          </div>
          <nav className="flex flex-col gap-0.5">
            {favoriteProjects.map((project) => {
              const isActive = pathname.startsWith(`/projects/${project.id}`);
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors duration-[120ms] ease-[ease] ${
                    isActive
                      ? 'bg-muted font-medium text-primary'
                      : 'text-secondary hover:bg-subtle hover:text-primary'
                  }`}
                >
                  <Star
                    size={14}
                    weight="fill"
                    className="shrink-0 text-[var(--color-text-warning)]"
                  />
                  <span className="truncate">{project.name}</span>
                </Link>
              );
            })}
          </nav>
        </>
      )}

      {/* Recents section — only shown when there are recents */}
      {recentProjects.length > 0 && (
        <>
          <div className="mt-6 mb-2 px-3">
            <h3 className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Recent
            </h3>
          </div>
          <nav className="flex flex-col gap-0.5">
            {recentProjects.map((project) => {
              const isActive = pathname.startsWith(`/projects/${project.id}`);
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors duration-[120ms] ease-[ease] ${
                    isActive
                      ? 'bg-muted font-medium text-primary'
                      : 'text-secondary hover:bg-subtle hover:text-primary'
                  }`}
                >
                  <ClockCounterClockwise size={14} className="shrink-0" />
                  <span className="truncate">{project.name}</span>
                </Link>
              );
            })}
          </nav>
        </>
      )}

      {/* Projects section */}
      <div className="mt-6 mb-2 px-3">
        <h3 className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          Projects
        </h3>
      </div>
      <nav className="flex flex-col gap-0.5">
        {projects.map((project: { id: string; name: string }, index: number) => {
          const isActive = pathname.startsWith(`/projects/${project.id}`);
          const dotColor = PROJECT_DOT_COLORS[index % PROJECT_DOT_COLORS.length];
          const favorited = isFavorite(project.id);

          return (
            <div
              key={project.id}
              className="group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors duration-[120ms] ease-[ease] data-[active=true]:bg-muted data-[active=true]:font-medium data-[active=true]:text-primary data-[active=false]:text-secondary data-[active=false]:hover:bg-subtle data-[active=false]:hover:text-primary"
              data-active={isActive}
            >
              <Link
                href={`/projects/${project.id}`}
                className="flex flex-1 items-center gap-2.5 overflow-hidden"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                <span className="truncate">{project.name}</span>
              </Link>
              {/* Star toggle: always visible if favorited, else visible on group hover */}
              <button
                type="button"
                aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                onClick={(e) => {
                  e.preventDefault();
                  toggleFavorite(project.id);
                }}
                className={`shrink-0 rounded p-0.5 transition-opacity duration-[120ms] ${
                  favorited
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                } hover:bg-subtle`}
              >
                <Star
                  size={12}
                  weight={favorited ? 'fill' : 'regular'}
                  className={
                    favorited
                      ? 'text-[var(--color-text-warning)]'
                      : 'text-secondary'
                  }
                />
              </button>
            </div>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <div className="flex flex-col gap-0.5">
        {user?.role === 'admin' && (
          <Link
            href="/admin"
            className={`flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors duration-[120ms] ease-[ease] ${
              pathname === '/admin'
                ? 'bg-muted font-medium text-primary'
                : 'text-secondary hover:bg-subtle hover:text-primary'
            }`}
          >
            <UsersThree size={16} className="shrink-0" />
            <span>Team</span>
          </Link>
        )}
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-secondary transition-colors duration-[120ms] ease-[ease] hover:bg-subtle hover:text-primary"
        >
          <GearSix size={16} className="shrink-0" />
          <span>Settings</span>
        </Link>
        <Link
          href="/settings/chatgpt"
          className={`flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors duration-[120ms] ease-[ease] ${
            pathname === '/settings/chatgpt'
              ? 'bg-muted font-medium text-primary'
              : 'text-secondary hover:bg-subtle hover:text-primary'
          }`}
        >
          <Robot size={16} className="shrink-0" />
          <span>ChatGPT</span>
        </Link>
      </div>
    </aside>
  );
}
