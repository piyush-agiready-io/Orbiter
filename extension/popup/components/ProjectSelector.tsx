import React, { useState, useEffect } from 'react';
import { apiRequest } from '@ext/shared/api';
import type { ExtProject } from '@ext/shared/types';

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
}

export function ProjectSelector({ selectedProjectId, onSelect }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<ExtProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      setIsLoading(true);
      const result = await apiRequest<{ projects: ExtProject[] } | ExtProject[]>('/projects?limit=100');

      if (result.success) {
        const projects = Array.isArray(result.data) ? result.data : result.data?.projects ?? [];
        setProjects(projects);
        if (!selectedProjectId && projects.length > 0) {
          onSelect(projects[0].id);
        }
      } else {
        setError(result.error);
      }

      setIsLoading(false);
    }

    fetchProjects();
  }, []);

  if (isLoading) {
    return (
      <div
        className="h-9 rounded-md animate-pulse"
        style={{ background: 'var(--color-bg-subtle)' }}
      />
    );
  }

  if (error) {
    return (
      <p className="text-xs" style={{ color: 'var(--color-error)' }}>
        Failed to load projects
      </p>
    );
  }

  if (projects.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        No projects available
      </p>
    );
  }

  return (
    <div>
      <label
        htmlFor="project"
        className="block text-xs font-medium mb-1.5"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Project
      </label>
      <select
        id="project"
        value={selectedProjectId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-md outline-none appearance-none cursor-pointer"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-default)',
          color: 'var(--color-text-primary)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
}
