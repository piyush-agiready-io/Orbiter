'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Plus, FolderSimple, Users } from '@phosphor-icons/react';
import Avatar from 'boring-avatars';
import { useQuery } from '@tanstack/react-query';
import { useProjects, useCreateProject } from '@/hooks/queries/use-projects';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/shared/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectStats } from '@/components/features/dashboard/project-stats';
import { ChatGPTConnectBanner } from '@/components/features/dashboard/chatgpt-connect-banner';
import { useState } from 'react';

interface Project {
  id: string;
  name: string;
  description?: string;
  slug: string;
  status: 'active' | 'archived';
  owner: string;
  members: string[];
  clients: string[];
  updatedAt: string;
  createdAt: string;
}

interface ProjectTaskStats {
  projectId: string;
  taskCount: number;
  doneCount: number;
  activeCount: number;
}

const AVATAR_COLORS = ['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9'];

function ProjectCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-1/2" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-4 w-24" />
      </CardFooter>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useProjects();
  const user = useAuth((s) => s.user);
  const createProject = useCreateProject();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const canCreate = user?.role === 'admin' || user?.role === 'internal';
  const projectData = data as { projects?: Project[]; total?: number } | undefined;
  const projects = projectData?.projects ?? [];

  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<Record<string, ProjectTaskStats>>('/dashboard/stats'),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
  const projectStats = statsData as Record<string, ProjectTaskStats> | undefined;

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createProject.mutate(
      { name: newName.trim(), description: newDescription.trim() || undefined },
      {
        onSuccess: () => {
          setNewName('');
          setNewDescription('');
          setShowCreate(false);
        },
      },
    );
  }

  return (
    <div className="p-6">
      <ChatGPTConnectBanner />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">Projects</h1>
          <p className="mt-1 text-sm text-secondary">
            {isLoading
              ? 'Loading projects...'
              : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canCreate && !showCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} data-icon="inline-start" />
            Create Project
          </Button>
        )}
      </div>

      {/* Inline create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mt-6 rounded-lg border border-subtle bg-surface p-4"
        >
          <h2 className="text-sm font-medium text-primary">New Project</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="project-name" className="block text-sm font-medium text-primary">
                Name
              </label>
              <input
                id="project-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Acme Website Redesign"
                className="mt-1 h-8 w-full max-w-md rounded-md border border-default bg-surface px-3 text-sm text-primary placeholder:text-muted transition-colors duration-[120ms] ease-out focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="project-desc" className="block text-sm font-medium text-primary">
                Description <span className="text-secondary">(optional)</span>
              </label>
              <input
                id="project-desc"
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description of the project"
                className="mt-1 h-8 w-full max-w-md rounded-md border border-default bg-surface px-3 text-sm text-primary placeholder:text-muted transition-colors duration-[120ms] ease-out focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button type="submit" disabled={createProject.isPending || !newName.trim()}>
              {createProject.isPending ? 'Creating...' : 'Create'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowCreate(false);
                setNewName('');
                setNewDescription('');
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && projects.length === 0 && (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-subtle">
            <FolderSimple size={24} className="text-secondary" />
          </div>
          {user?.role === 'admin' ? (
            <>
              <h2 className="mt-4 text-base font-medium text-primary">No projects yet</h2>
              <p className="mt-1 max-w-sm text-sm text-secondary">
                Create your first project to start tracking tasks, sprints, and more.
              </p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus size={16} data-icon="inline-start" />
                Create your first project
              </Button>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-base font-medium text-primary">No projects assigned</h2>
              <p className="mt-1 max-w-sm text-sm text-secondary">
                You haven&apos;t been added to any projects yet. Ask your admin to add you to a
                project from the project settings.
              </p>
              {canCreate && (
                <Button className="mt-4" variant="secondary" onClick={() => setShowCreate(true)}>
                  <Plus size={16} data-icon="inline-start" />
                  Create a new project
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* Project grid */}
      {!isLoading && projects.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const memberCount = (project.members?.length ?? 0) + (project.clients?.length ?? 0);
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group block"
              >
                <Card className="transition-shadow duration-[120ms] ease-out group-hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="truncate">{project.name}</span>
                      <Badge
                        variant={project.status === 'active' ? 'secondary' : 'outline'}
                        className="shrink-0"
                      >
                        {project.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {project.description ? (
                      <p className="line-clamp-2 text-sm text-secondary">
                        {project.description}
                      </p>
                    ) : (
                      <p className="text-sm text-muted italic">No description</p>
                    )}
                    {projectStats?.[project.id] && (
                      <ProjectStats
                        taskCount={projectStats[project.id].taskCount}
                        doneCount={projectStats[project.id].doneCount}
                        activeCount={projectStats[project.id].activeCount}
                      />
                    )}
                  </CardContent>
                  <CardFooter className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-secondary">
                      {memberCount > 0 ? (
                        <>
                          <div className="flex -space-x-1.5">
                            {Array.from({ length: Math.min(memberCount, 3) }).map((_, i) => (
                              <div
                                key={i}
                                className="h-5 w-5 overflow-hidden rounded-full border-2 border-surface"
                              >
                                <Avatar
                                  size={16}
                                  variant="beam"
                                  name={`member-${project.id}-${i}`}
                                  colors={AVATAR_COLORS}
                                />
                              </div>
                            ))}
                          </div>
                          <span>
                            {memberCount} member{memberCount !== 1 ? 's' : ''}
                          </span>
                        </>
                      ) : (
                        <>
                          <Users size={14} className="text-muted" />
                          <span>No members</span>
                        </>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted">
                      {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
