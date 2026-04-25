'use client';

import { useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GitBranch, Trash, UserPlus } from '@phosphor-icons/react';
import { useProject } from '@/hooks/queries/use-projects';
import { useUsers } from '@/hooks/queries/use-users';
import { useAuth } from '@/hooks/use-auth';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Avatar from 'boring-avatars';
import { toast } from 'sonner';

const updateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof updateSchema>;

interface GitHubRepo {
  owner: string;
  repo: string;
}

interface PopulatedUser {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  avatar?: string;
}

interface ProjectData {
  name?: string;
  description?: string;
  githubRepos?: GitHubRepo[];
  owner?: PopulatedUser;
  members?: PopulatedUser[];
  clients?: PopulatedUser[];
}

export default function ProjectSettingsPage() {
  const params = useParams<{ id: string }>();
  const { data } = useProject(params.id);
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [repoInput, setRepoInput] = useState('');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [memberRole, setMemberRole] = useState<string>('member');

  const project = data as ProjectData | undefined;
  const githubRepos = project?.githubRepos ?? [];
  const isAdmin = currentUser?.role === 'admin';

  const { data: usersData } = useUsers();
  const allUsers = (usersData as { users?: { id: string; name: string; email: string; role: string }[] } | undefined)?.users ?? [];

  const ownerId = project?.owner?.id ?? project?.owner?._id;
  const memberIds = new Set([
    ...(project?.members?.map((m) => m.id ?? m._id) ?? []),
    ...(project?.clients?.map((c) => c.id ?? c._id) ?? []),
    ownerId,
  ].filter(Boolean));

  const availableUsers = allUsers.filter((u) => !memberIds.has(u.id));

  const addMember = useMutation({
    mutationFn: (payload: { userId: string; role: string }) =>
      api.post(`/projects/${params.id}/members`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', params.id] });
      setAddMemberOpen(false);
      setSelectedUserId('');
      setMemberRole('member');
      toast.success('Member added');
    },
    onError: () => {
      toast.error('Failed to add member');
    },
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/projects/${params.id}/members`, { userId, role: 'member' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', params.id] });
      toast.success('Member removed');
    },
    onError: () => {
      toast.error('Failed to remove member');
    },
  });

  const updateProject = useMutation({
    mutationFn: (values: FormValues) => api.patch(`/projects/${params.id}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', params.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const updateGithubRepos = useMutation({
    mutationFn: (repos: GitHubRepo[]) =>
      api.patch(`/projects/${params.id}`, { githubRepos: repos }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', params.id] });
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      name: '',
      description: '',
    },
    values: project
      ? { name: project.name ?? '', description: project.description ?? '' }
      : undefined,
  });

  const onSubmit = (values: FormValues) => {
    updateProject.mutate(values);
  };

  const handleAddRepo = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = repoInput.trim();
    if (!trimmed) return;

    const parts = trimmed.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      toast.error('Enter a valid owner/repo (e.g. acme/my-app)');
      return;
    }

    const [owner, repo] = parts;
    const alreadyExists = githubRepos.some(
      (r) => r.owner === owner && r.repo === repo,
    );
    if (alreadyExists) {
      toast.error('This repository is already connected');
      return;
    }

    updateGithubRepos.mutate([...githubRepos, { owner, repo }], {
      onSuccess: () => {
        setRepoInput('');
        toast.success(`Added ${owner}/${repo}`);
      },
    });
  };

  const handleRemoveRepo = (target: GitHubRepo) => {
    const next = githubRepos.filter(
      (r) => !(r.owner === target.owner && r.repo === target.repo),
    );
    updateGithubRepos.mutate(next, {
      onSuccess: () => toast.success(`Removed ${target.owner}/${target.repo}`),
    });
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h2 className="text-base font-semibold text-primary">Project Settings</h2>
      <p className="mt-1 text-sm text-secondary">Manage project details and configuration.</p>

      <div className="mt-6 rounded-lg border border-subtle bg-surface p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-primary">Project Name</Label>
            <Input {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-error">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-primary">Description</Label>
            <textarea
              {...form.register('description')}
              rows={3}
              className="w-full rounded-md border border-[var(--color-border-default)] bg-surface px-3 py-2 text-sm text-primary placeholder:text-[var(--color-text-muted)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={updateProject.isPending}>
              {updateProject.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            {saved && <span className="text-sm text-success">Saved!</span>}
          </div>
        </form>
      </div>

      {/* GitHub Repositories */}
      <div className="mt-6 rounded-lg border border-subtle bg-surface p-6">
        <h3 className="text-sm font-semibold text-primary">GitHub Repositories</h3>
        <p className="mt-1 text-sm text-secondary">
          Connected repos for commit syncing. The sync agent uses these to fetch commits and PRs.
        </p>

        {githubRepos.length > 0 && (
          <div className="mt-4 space-y-2">
            {githubRepos.map((repo) => (
              <div
                key={`${repo.owner}/${repo.repo}`}
                className="flex items-center justify-between rounded-md border border-[var(--color-border-subtle)] px-3 py-2"
              >
                <div className="flex items-center gap-2 text-sm text-primary">
                  <GitBranch size={16} className="shrink-0 text-secondary" />
                  <span className="font-mono text-xs">{repo.owner}/{repo.repo}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-[var(--color-error)]"
                  onClick={() => handleRemoveRepo(repo)}
                  disabled={updateGithubRepos.isPending}
                >
                  <Trash size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddRepo} className="mt-4 flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label className="text-sm font-medium text-primary">Add Repository</Label>
            <Input
              placeholder="owner/repo (e.g. acme/my-app)"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            disabled={!repoInput.trim() || updateGithubRepos.isPending}
          >
            {updateGithubRepos.isPending ? 'Adding...' : 'Add'}
          </Button>
        </form>
      </div>

      {/* Team Members */}
      <div className="mt-6 rounded-lg border border-subtle bg-surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-primary">Team Members</h3>
            <p className="mt-1 text-sm text-secondary">
              Manage who has access to this project.
            </p>
          </div>
          {isAdmin && (
            <Button variant="secondary" size="sm" onClick={() => setAddMemberOpen(true)}>
              <UserPlus size={14} className="mr-1" />
              Add Member
            </Button>
          )}
        </div>

        <div className="mt-4 divide-y divide-subtle">
          {/* Owner */}
          {project?.owner && (
            <div className="flex items-center gap-3 py-3">
              <Avatar
                size={32}
                variant="beam"
                name={project.owner.name}
                colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">{project.owner.name}</p>
                <p className="text-xs text-[var(--color-text-muted)] truncate">{project.owner.email}</p>
              </div>
              <Badge className="bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]">
                Owner
              </Badge>
            </div>
          )}

          {/* Members */}
          {project?.members
            ?.filter((m) => (m.id ?? m._id) !== ownerId)
            .map((member) => {
              const memberId = member.id ?? member._id;
              return (
                <div key={memberId} className="flex items-center gap-3 py-3">
                  <Avatar
                    size={32}
                    variant="beam"
                    name={member.name}
                    colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{member.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">{member.email}</p>
                  </div>
                  <Badge className="bg-[var(--color-info-muted)] text-[var(--color-info)]">
                    Member
                  </Badge>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-[var(--color-error)]"
                      onClick={() => memberId && removeMember.mutate(memberId)}
                      disabled={removeMember.isPending}
                    >
                      <Trash size={14} />
                    </Button>
                  )}
                </div>
              );
            })}

          {/* Clients */}
          {project?.clients?.map((client) => {
            const clientId = client.id ?? client._id;
            return (
              <div key={clientId} className="flex items-center gap-3 py-3">
                <Avatar
                  size={32}
                  variant="beam"
                  name={client.name}
                  colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{client.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{client.email}</p>
                </div>
                <Badge className="bg-[var(--color-info-muted)] text-[var(--color-info)]">
                  Client
                </Badge>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-[var(--color-error)]"
                    onClick={() => clientId && removeMember.mutate(clientId)}
                    disabled={removeMember.isPending}
                  >
                    <Trash size={14} />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="bg-surface border-[var(--color-border-subtle)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-primary">
              Add Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-primary">User</Label>
              <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v ?? '')}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-primary">Role</Label>
              <Select value={memberRole} onValueChange={(v) => setMemberRole(v ?? 'member')}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setAddMemberOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedUserId &&
                  addMember.mutate({ userId: selectedUserId, role: memberRole })
                }
                disabled={!selectedUserId || addMember.isPending}
              >
                {addMember.isPending ? 'Adding...' : 'Add Member'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
