'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { usePortalProject } from '@/hooks/queries/use-portal-data';

const TABS = [
  { label: 'Overview', href: '' },
  { label: 'Board', href: '/board' },
  { label: 'Timeline', href: '/timeline' },
  { label: 'Links', href: '/links' },
];

export default function PortalProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const { data } = usePortalProject(params.id);

  const project = data as { name?: string } | undefined;
  const basePath = `/portal/projects/${params.id}`;

  return (
    <div className="flex h-full flex-col">
      {/* Project header */}
      <div className="border-b border-subtle bg-surface px-6 pt-5 pb-0">
        <h1 className="text-lg font-semibold tracking-tight text-primary">
          {project?.name ?? 'Project'}
        </h1>

        {/* Tab navigation */}
        <nav className="mt-3 flex gap-1">
          {TABS.map((tab) => {
            const tabPath = `${basePath}${tab.href}`;
            const isActive =
              tab.href === ''
                ? pathname === basePath
                : pathname.startsWith(tabPath);

            return (
              <Link
                key={tab.href}
                href={tabPath}
                className={`relative inline-flex items-center px-3 py-2 text-sm font-medium transition-colors duration-[120ms] ${
                  isActive
                    ? 'text-primary'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
