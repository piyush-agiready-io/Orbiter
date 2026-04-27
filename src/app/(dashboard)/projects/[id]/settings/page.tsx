'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash, UserPlus, Copy, CheckCircle, EnvelopeSimple } from '@phosphor-icons/react';
import { useProject, useDeleteProject } from '@/hooks/queries/use-projects';
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
import { InfoTip } from '@/components/shared/info-tip';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

const updateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof updateSchema>;

interface PopulatedUser {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  avatar?: string;
}

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
  inviteStatus?: string;
}

interface ProjectData {
  name?: string;
  description?: string;
  owner?: PopulatedUser;
  members?: PopulatedUser[];
  clients?: PopulatedUser[];
}

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-[var(--color-error-muted)] text-[var(--color-error)]',
  internal: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]',
  client: 'bg-[var(--color-info-muted)] text-[var(--color-info)]',
};

export default function ProjectSettingsPage() {
  const params = useParams<{ id: string }>();
  const { data } = useProject(params.id);
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [inviteClientOpen, setInviteClientOpen] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [clientInviteToken, setClientInviteToken] = useState<string | null>(null);
  const [clientInviteCopied, setClientInviteCopied] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [removingMember, setRemovingMember] = useState<{ id: string; name: string; role: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();
  const deleteProject = useDeleteProject();

  const project = data as ProjectData | undefined;
  const isAdmin = currentUser?.role === 'admin';

  const { data: usersData } = useUsers();
  const allUsers: PlatformUser[] = (usersData as { users?: PlatformUser[] } | undefined)?.users ?? [];

  const ownerId = project?.owner?.id ?? project?.owner?._id;
  const memberIds = new Set([
    ...(project?.members?.map((m) => m.id ?? m._id) ?? []),
    ...(project?.clients?.map((c) => c.id ?? c._id) ?? []),
    ownerId,
  ].filter(Boolean));

  const availableUsers = allUsers.filter(
    (u) =>
      !memberIds.has(u.id) &&
      u.inviteStatus === 'active' &&
      u.role !== 'client',
  );

  const selectedUser = allUsers.find((u) => u.id === selectedUserId);
  const autoRole = selectedUser?.role === 'client' ? 'client' : 'member';

  const addMember = useMutation({
    mutationFn: (payload: { userId: string; role: string }) =>
      api.post(`/projects/${params.id}/members`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', params.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setAddMemberOpen(false);
      setSelectedUserId('');
      toast.success('Member added');
    },
    onError: () => toast.error('Failed to add member'),
  });

  const removeMember = useMutation({
    mutationFn: (payload: { userId: string; role: string }) =>
      api.post(`/projects/${params.id}/members`, { ...payload, action: 'remove' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', params.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Member removed');
    },
    onError: () => toast.error('Failed to remove member'),
  });

  const inviteClient = useMutation({
    mutationFn: (email: string) =>
      api.post<{ user: { name: string; email: string }; inviteToken?: string }>(
        `/projects/${params.id}/clients`,
        { email },
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['project', params.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      const data = result as { inviteToken?: string };
      if (data?.inviteToken) {
        setClientInviteToken(data.inviteToken);
      } else {
        setInviteClientOpen(false);
        setClientEmail('');
        toast.success('Client added to project');
      }
    },
    onError: (err: unknown) => {
      const message =
        (err as { message?: string })?.message ?? 'Failed to invite client';
      toast.error(message);
    },
  });

  const closeInviteClient = () => {
    setInviteClientOpen(false);
    setClientEmail('');
    setClientInviteToken(null);
    setClientInviteCopied(false);
  };

  const handleCopyClientInvite = () => {
    if (!clientInviteToken) return;
    const link = `${window.location.origin}/register/${clientInviteToken}`;
    navigator.clipboard.writeText(link).then(() => {
      setClientInviteCopied(true);
      setTimeout(() => setClientInviteCopied(false), 2000);
    });
  };

  const updateProject = useMutation({
    mutationFn: (values: FormValues) => api.patch(`/projects/${params.id}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', params.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: { name: '', description: '' },
    values: project
      ? { name: project.name ?? '', description: project.description ?? '' }
      : undefined,
  });

  const allMembers = [
    ...(project?.members?.filter((m) => (m.id ?? m._id) !== ownerId) ?? []).map((m) => ({
      ...m,
      projectRole: 'member' as const,
    })),
    ...(project?.clients ?? []).map((c) => ({
      ...c,
      projectRole: 'client' as const,
    })),
  ];

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h2 className="text-base font-semibold text-primary">Project Settings</h2>
      <p className="mt-1 text-sm text-secondary">Manage project details and team.</p>

      {/* Project Info */}
      <div className="mt-6 rounded-lg border border-subtle bg-surface p-6">
        <form onSubmit={form.handleSubmit((v) => updateProject.mutate(v))} className="space-y-4">
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

      {/* Team Members */}
      <div className="mt-6 rounded-lg border border-subtle bg-surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-primary">Team Members</h3>
              <InfoTip text="Add platform users to this project. Their role (Member/Client) is auto-assigned based on their platform role. Clients get read-only portal access." />
            </div>
            <p className="mt-1 text-sm text-secondary">
              {(allMembers.length + 1)} member{allMembers.length !== 0 ? 's' : ''} on this project
            </p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setAddMemberOpen(true)}>
                <UserPlus size={14} className="mr-1" />
                Add Member
              </Button>
              <Button size="sm" onClick={() => setInviteClientOpen(true)}>
                <EnvelopeSimple size={14} className="mr-1" />
                Invite Client
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 divide-y divide-subtle">
          {/* Owner */}
          {project?.owner && (
            <MemberRow
              name={project.owner.name}
              email={project.owner.email}
              role="Owner"
              roleStyle="bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]"
            />
          )}

          {/* Members + Clients */}
          {allMembers.map((member) => {
            const id = member.id ?? member._id ?? '';
            const isClient = member.projectRole === 'client';
            return (
              <MemberRow
                key={id}
                name={member.name}
                email={member.email}
                role={isClient ? 'Client' : 'Member'}
                roleStyle={isClient
                  ? 'bg-[var(--color-info-muted)] text-[var(--color-info)]'
                  : 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
                }
                onRemove={isAdmin ? () => setRemovingMember({ id, name: member.name, role: member.projectRole }) : undefined}
                removing={removeMember.isPending}
              />
            );
          })}

          {allMembers.length === 0 && !project?.owner && (
            <div className="py-6 text-center text-sm text-secondary">
              No members yet. Add team members to collaborate.
            </div>
          )}
        </div>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="bg-surface border-[var(--color-border-subtle)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-primary">
              Add Member to Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-primary">Select User</Label>
              <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v ?? '')}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose a team member" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-[var(--color-text-muted)]">
                      All users are already on this project
                    </div>
                  ) : (
                    availableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          <span>{u.name}</span>
                          <span className="text-[var(--color-text-muted)]">({u.email})</span>
                          <Badge className={`${ROLE_BADGE[u.role] ?? ''} ml-1 text-[10px] px-1.5 py-0`}>
                            {u.role}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedUser && (
              <div className="rounded-md bg-subtle px-3 py-2 text-xs text-secondary">
                <strong>{selectedUser.name}</strong> will be added as{' '}
                <strong>{autoRole === 'client' ? 'a Client (read-only)' : 'a Member (full access)'}</strong>
                {' '}based on their platform role.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => { setAddMemberOpen(false); setSelectedUserId(''); }}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedUserId && addMember.mutate({ userId: selectedUserId, role: autoRole })}
                disabled={!selectedUserId || addMember.isPending}
              >
                {addMember.isPending ? 'Adding...' : 'Add to Project'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client visibility helper */}
      {isAdmin && (
        <div className="mt-6 rounded-lg border border-subtle bg-surface p-6">
          <h3 className="text-sm font-semibold text-primary">Client Portal Visibility</h3>
          <p className="mt-1 text-sm text-secondary">
            By default new tasks are visible to clients in their portal. Use the checkbox on each
            task to hide internal-only work. If clients on this project can&apos;t see existing
            tasks, run a one-time backfill below.
          </p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => {
              api
                .post<{ updated: number }>(
                  `/projects/${params.id}/tasks/show-all-to-client`,
                )
                .then((res) => {
                  const updated = (res as { updated?: number })?.updated ?? 0;
                  toast.success(
                    updated === 0
                      ? 'All tasks were already visible to clients.'
                      : `${updated} task${updated === 1 ? ' is' : 's are'} now visible to clients.`,
                  );
                  queryClient.invalidateQueries({ queryKey: ['tasks', params.id] });
                })
                .catch((err: unknown) =>
                  toast.error(
                    (err as { message?: string })?.message ??
                      'Could not update visibility',
                  ),
                );
            }}
          >
            Show all existing tasks to client
          </Button>
        </div>
      )}

      {/* Invite Client Dialog */}
      <Dialog open={inviteClientOpen} onOpenChange={(v) => !v && closeInviteClient()}>
        <DialogContent className="bg-surface border-[var(--color-border-subtle)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-primary">
              Invite Client
            </DialogTitle>
          </DialogHeader>

          {clientInviteToken ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-md bg-[var(--color-success-muted)] px-3 py-2">
                <CheckCircle size={16} weight="fill" className="text-[var(--color-success)]" />
                <p className="text-sm text-[var(--color-success)]">
                  Invite sent. Share the link if the email doesn&apos;t arrive.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-subtle px-3 py-2 text-xs text-primary break-all">
                  {`${typeof window !== 'undefined' ? window.location.origin : ''}/register/${clientInviteToken}`}
                </code>
                <Button variant="ghost" size="icon-sm" onClick={handleCopyClientInvite}>
                  {clientInviteCopied ? (
                    <CheckCircle size={16} weight="fill" className="text-[var(--color-success)]" />
                  ) : (
                    <Copy size={16} />
                  )}
                </Button>
              </div>
              <div className="flex justify-end">
                <Button onClick={closeInviteClient}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-secondary">
                Clients get read-only portal access to this project only. They&apos;ll receive an email with a link to set their password.
              </p>
              <div>
                <Label className="text-sm font-medium text-primary">Client email</Label>
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="mt-1.5"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={closeInviteClient}>Cancel</Button>
                <Button
                  onClick={() => clientEmail && inviteClient.mutate(clientEmail.trim())}
                  disabled={!clientEmail || inviteClient.isPending}
                >
                  {inviteClient.isPending ? 'Inviting…' : 'Send Invite'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Danger Zone */}
      {isAdmin && (
        <div className="mt-6 rounded-lg border border-[var(--color-error)]/20 bg-surface p-6">
          <h3 className="text-sm font-semibold text-[var(--color-error)]">Danger Zone</h3>
          <p className="mt-1 text-sm text-secondary">
            Permanently delete this project and all its tasks, sprints, bugs, docs, and links.
          </p>
          <Button
            variant="destructive"
            className="mt-3"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash size={14} className="mr-1.5" />
            Delete Project
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!removingMember}
        onOpenChange={(open) => !open && setRemovingMember(null)}
        title="Remove member"
        description={`${removingMember?.name} will lose access to this project.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => removingMember && removeMember.mutate({ userId: removingMember.id, role: removingMember.role })}
        loading={removeMember.isPending}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete project"
        description={`"${project?.name}" and all its data will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete Project"
        variant="danger"
        onConfirm={() => {
          deleteProject.mutate(params.id, {
            onSuccess: () => router.replace('/'),
          });
        }}
        loading={deleteProject.isPending}
      />
    </div>
  );
}

function MemberRow({
  name,
  email,
  role,
  roleStyle,
  onRemove,
  removing,
}: {
  name: string;
  email: string;
  role: string;
  roleStyle: string;
  onRemove?: () => void;
  removing?: boolean;
}) {
  return (
    <div className="group flex items-center gap-3 py-3">
      <Avatar
        size={32}
        variant="beam"
        name={name}
        colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-primary truncate">{name}</p>
        <p className="text-xs text-[var(--color-text-muted)] truncate">{email}</p>
      </div>
      <Badge className={roleStyle}>{role}</Badge>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-[var(--color-error)] opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
          disabled={removing}
        >
          <Trash size={14} />
        </Button>
      )}
    </div>
  );
}
