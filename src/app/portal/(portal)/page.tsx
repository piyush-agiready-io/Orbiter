'use client';

import { usePortalProjects } from '@/hooks/queries/use-portal-data';
import { PortalProjectCard } from '@/components/features/portal/portal-project-card';

export default function PortalPage() {
  const { data, isLoading } = usePortalProjects();

  const raw = data as { projects?: { id: string; name: string; status?: string; progress?: number }[] } | undefined;
  const projects = raw?.projects ?? [];

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold tracking-tight text-primary">Your Projects</h1>
      <p className="mt-1 text-sm text-secondary">
        View progress and updates across your projects.
      </p>

      {isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-subtle" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm text-secondary">No projects available yet.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <PortalProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
