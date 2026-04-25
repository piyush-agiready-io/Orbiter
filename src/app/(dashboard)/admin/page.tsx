'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useUsers, useInviteUser } from '@/hooks/queries/use-users';
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
import { Copy, CheckCircle, UserPlus, EnvelopeSimple } from '@phosphor-icons/react';

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-[var(--color-error-muted)] text-[var(--color-error)]',
  internal: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]',
  client: 'bg-[var(--color-info-muted)] text-[var(--color-info)]',
};

export default function AdminPage() {
  const { user } = useAuth();
  const { data, isLoading } = useUsers();
  const inviteUser = useInviteUser();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('internal');
  const [inviteResult, setInviteResult] = useState<{ inviteToken: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (user?.role !== 'admin') {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-xl font-semibold text-primary">Access Denied</h1>
        <p className="mt-2 text-sm text-secondary">You need admin privileges to view this page.</p>
      </div>
    );
  }

  const users = (data as { users?: { id: string; name: string; email: string; role: string }[] } | undefined)?.users ?? [];

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

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">Team Management</h1>
          <p className="mt-1 text-sm text-secondary">Manage users and send invitations.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus size={16} className="mr-1.5" />
          Invite User
        </Button>
      </div>

      <div className="mt-6 rounded-lg border border-subtle bg-surface">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-subtle" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">No users found</p>
          </div>
        ) : (
          <div className="divide-y divide-subtle">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-6 py-3">
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
                <Badge className={ROLE_STYLES[u.role] ?? ''}>{u.role}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

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
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
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
    </div>
  );
}
