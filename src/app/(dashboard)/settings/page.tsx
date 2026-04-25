'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/shared/lib/api-client';
import { Button } from '@/components/ui/button';
import { SignOut } from '@phosphor-icons/react';
import Avatar from 'boring-avatars';

const profileSchema = z.object({
  name: z.string().min(2).max(100),
  skills: z.string().optional(),
});

type ProfileInput = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user, setAuth, accessToken, clearAuth } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [githubLoading, setGithubLoading] = useState(true);

  const fetchGithubStatus = useCallback(async () => {
    try {
      const status = await api.get<{ connected: boolean; username: string | null }>(
        '/auth/github/status',
      );
      setGithubConnected(status.connected);
      setGithubUsername(status.username);
    } catch {
      // Silently fail — user just sees disconnected state
    } finally {
      setGithubLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGithubStatus();
  }, [fetchGithubStatus]);

  async function disconnectGithub() {
    try {
      await api.post('/auth/github/disconnect');
      setGithubConnected(false);
      setGithubUsername(null);
    } catch {
      // Silently fail
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      skills: user?.skills?.join(', ') ?? '',
    },
  });

  async function onSubmit(data: ProfileInput) {
    setSaved(false);
    const skills = data.skills
      ? data.skills.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const updated = await api.patch('/users/me', { name: data.name, skills });
    if (user && accessToken) {
      setAuth({ ...user, name: data.name, skills } as typeof user, accessToken);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold tracking-tight text-primary">Settings</h1>
      <p className="mt-1 text-sm text-secondary">Manage your profile and preferences.</p>

      <div className="mt-8 rounded-lg border border-subtle bg-surface p-6">
        <div className="flex items-center gap-4">
          <Avatar size={56} variant="beam" name={user.name} colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']} />
          <div>
            <h2 className="text-base font-medium text-primary">{user.name}</h2>
            <p className="text-sm text-muted">{user.email}</p>
            <span className="mt-1 inline-block rounded-sm bg-accent-muted px-2 py-0.5 text-xs font-medium text-accent-text">
              {user.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-primary">Name</label>
            <input
              className="h-8 w-full rounded-md border border-default bg-surface px-3 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              {...register('name')}
            />
            {errors.name && <p className="text-sm text-error">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-primary">Skills</label>
            <input
              className="h-8 w-full rounded-md border border-default bg-surface px-3 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="react, typescript, nodejs"
              {...register('skills')}
            />
            <p className="text-xs text-muted">Comma-separated. Used by AI sprint assignment.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            {saved && <span className="text-sm text-success">Saved!</span>}
          </div>
        </form>
      </div>

      <div className="mt-6 rounded-lg border border-subtle bg-surface p-6">
        <h3 className="text-lg font-medium text-primary">GitHub Connection</h3>
        <p className="mt-1 text-sm text-secondary">
          Connect your GitHub account to enable commit syncing and automatic task status updates.
        </p>
        <div className="mt-4">
          {githubLoading ? (
            <div className="h-8 w-40 animate-pulse rounded-md bg-subtle" />
          ) : githubConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-sm text-primary">
                  Connected as <strong>{githubUsername}</strong>
                </span>
              </div>
              <Button variant="destructive" size="sm" onClick={disconnectGithub}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={() => (window.location.href = '/api/v1/auth/github')}>
              Connect GitHub
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-[var(--color-error)]/20 bg-surface p-6">
        <h3 className="text-lg font-medium text-primary">Sign Out</h3>
        <p className="mt-1 text-sm text-secondary">
          Sign out of your Orbiter account on this device.
        </p>
        <Button
          variant="destructive"
          className="mt-4"
          onClick={() => { clearAuth(); router.push('/login'); }}
        >
          <SignOut size={16} className="mr-1.5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
