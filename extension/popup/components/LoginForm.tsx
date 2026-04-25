import React, { useState, type FormEvent } from 'react';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
  error?: string | null;
}

export function LoginForm({ onLogin, error: externalError }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const success = await onLogin(email, password);
    if (!success) {
      setError('Invalid email or password');
    }

    setIsSubmitting(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[480px] p-6">
      <div className="mb-6 text-center">
        <h1
          className="text-xl font-semibold"
          style={{ color: 'var(--color-accent)' }}
        >
          Orbiter
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Sign in to capture bugs
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            placeholder="you@company.com"
            className="w-full px-3 py-2 text-sm rounded-md outline-none transition-colors"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            className="w-full px-3 py-2 text-sm rounded-md outline-none transition-colors"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {(error || externalError) && (
          <p
            className="text-xs"
            style={{ color: 'var(--color-error)' }}
          >
            {error || externalError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-text-inverse)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
