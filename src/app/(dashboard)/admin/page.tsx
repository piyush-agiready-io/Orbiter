'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useUsers, useInviteUser, useDeactivateUser, useResendInvite } from '@/hooks/queries/use-users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import Avatar from 'boring-avatars';
import {
  Copy,
  CheckCircle,
  UserPlus,
  EnvelopeSimple,
  Trash,
  ArrowClockwise,
  Clock,
  Warning,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { InfoTip } from '@/components/shared/info-tip';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-[var(--color-error-muted)] text-[var(--color-error)]',
  internal: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]',
  client: 'bg-[var(--color-info-muted)] text-[var(--color-info)]',
};

const INVITE_STATUS_CONFIG: Record<string, { label: string; style: string; icon: React.ReactNode }> = {
  active: {
    label: 'Active',
    style: 'bg-[var(--color-success-muted)] text-[var(--color-success)]',
    icon: <CheckCircle size={12} weight="fill" />,
  },
  pending: {
    label: 'Pending',
    style: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
    icon: <Clock size={12} />,
  },
  expired: {
    label: 'Expired',
    style: 'bg-[var(--color-error-muted)] text-[var(--color-error)]',
    icon: <Warning size={12} />,
  },
};

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  inviteStatus: 'active' | 'pending' | 'expired';
}

export default function AdminPage() {
  const { user } = useAuth();
  const { data, isLoading } = useUsers();
  const inviteUser = useInviteUser();
  const deactivateUser = useDeactivateUser();
  const resendInvite = useResendInvite();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('internal');
  const [inviteResult, setInviteResult] = useState<{ inviteToken: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);

  if (user?.role !== 'admin') {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-xl font-semibold text-primary">Access Denied</h1>
        <p className="mt-2 text-sm text-secondary">You need admin privileges to view this page.</p>
      </div>
    );
  }

  const users: UserItem[] = (data as { users?: UserItem[] } | undefined)?.users ?? [];

  const handleInvite = async () => {
    if (!email) return;
    const result = await inviteUser.mutateAsync({ email, role });
    const resultData = result as unknown as { inviteToken: string };
    setInviteResult(resultData);
  };

  const handleCopyLink = () => {
    if (!inviteResult) return;
    const link = `${window.location.origin}/register/${inviteResult.inviteToken}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEmail('');
    setRole('internal');
    setInviteResult(null);
    setCopied(false);
  };

  const handleResend = (u: UserItem) => {
    resendInvite.mutate(u.id, {
      onSuccess: () => toast.success(`Invite resent to ${u.email}`),
      onError: () => toast.error('Failed to resend invite'),
    });
  };

  const activeUsers = users.filter((u) => u.inviteStatus === 'active');
  const pendingUsers = users.filter((u) => u.inviteStatus === 'pending');
  const expiredUsers = users.filter((u) => u.inviteStatus === 'expired');

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-primary">Team Management</h1>
            <InfoTip text="Invite team members (Admins and Internal). New team members are automatically added to every project. Clients are invited from inside a specific project's Settings tab." />
          </div>
          <p className="mt-1 text-sm text-secondary">
            {users.length} members — {activeUsers.length} active, {pendingUsers.length} pending
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus size={16} className="mr-1.5" />
          Invite User
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg border border-subtle bg-surface" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="mt-6 rounded-lg border border-subtle bg-surface py-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">No team members yet. Invite your first user.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {[
            { title: 'Active Members', items: activeUsers },
            { title: 'Pending Invites', items: pendingUsers },
            { title: 'Expired Invites', items: expiredUsers },
          ]
            .filter((section) => section.items.length > 0)
            .map((section) => (
              <div key={section.title}>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  {section.title} ({section.items.length})
                </h3>
                <div className="rounded-lg border border-subtle bg-surface divide-y divide-subtle">
                  {section.items.map((u) => {
                    const statusConfig = INVITE_STATUS_CONFIG[u.inviteStatus];
                    return (
                      <div key={u.id} className="group flex items-center gap-4 px-5 py-3">
                        <Avatar
                          size={32}
                          variant="beam"
                          name={u.name}
                          colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-primary truncate">{u.name}</p>
                          <p className="text-xs text-[var(--color-text-muted)] truncate">{u.email}</p>
                        </div>
                        <Badge className={statusConfig.style}>
                          <span className="mr-1">{statusConfig.icon}</span>
                          {statusConfig.label}
                        </Badge>
                        <Badge className={ROLE_STYLES[u.role] ?? ''}>{u.role}</Badge>
                        <div className="flex items-center gap-1">
                          {(u.inviteStatus === 'pending' || u.inviteStatus === 'expired') && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Resend invite"
                              onClick={() => handleResend(u)}
                              disabled={resendInvite.isPending}
                            >
                              <ArrowClockwise size={16} />
                            </Button>
                          )}
                          {u.id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-[var(--color-error)] opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setDeleteTarget(u)}
                            >
                              <Trash size={16} />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => !v && handleCloseDialog()}>
        <DialogContent className="bg-surface border-[var(--color-border-subtle)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-primary">Invite User</DialogTitle>
          </DialogHeader>

          {inviteResult ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-md bg-[var(--color-success-muted)] px-3 py-2">
                <EnvelopeSimple size={16} className="text-[var(--color-success)]" />
                <p className="text-sm text-[var(--color-success)]">
                  Invitation email sent
                </p>
              </div>
              <p className="text-sm text-secondary">
                You can also share this link directly:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-subtle px-3 py-2 text-xs text-primary break-all">
                  {`${typeof window !== 'undefined' ? window.location.origin : ''}/register/${inviteResult.inviteToken}`}
                </code>
                <Button variant="ghost" size="icon-sm" onClick={handleCopyLink}>
                  {copied ? (
                    <CheckCircle size={16} weight="fill" className="text-[var(--color-success)]" />
                  ) : (
                    <Copy size={16} />
                  )}
                </Button>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleCloseDialog}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-primary">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-primary">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v ?? 'internal')}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-muted">
                  To invite a client, open the project they should access and use Invite Client in Settings.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={handleCloseDialog}>Cancel</Button>
                <Button onClick={handleInvite} disabled={!email || inviteUser.isPending}>
                  {inviteUser.isPending ? 'Inviting...' : 'Send Invite'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove team member"
        description={`${deleteTarget?.name} will be removed from the platform and lose access to all projects.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => deleteTarget && deactivateUser.mutate(deleteTarget.id)}
        loading={deactivateUser.isPending}
      />
    </div>
  );
}
