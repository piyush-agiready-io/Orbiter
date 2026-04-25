import React, { useState, type FormEvent } from 'react';
import { PLATFORM_URL } from '@ext/shared/constants';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
  error?: string | null;
}

export function LoginForm({ onLogin, error: externalError }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  function openPlatform() {
    chrome.tabs.create({ url: PLATFORM_URL });
  }

  return (
    <div className="flex flex-col min-h-[480px] p-6">
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

      {/* Platform login prompt */}
      <div
        className="mb-4 rounded-md px-3 py-3 text-center"
        style={{
          background: 'var(--color-bg-subtle)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          Already logged into the platform?
        </p>
        <button
          type="button"
          onClick={openPlatform}
          className="text-xs font-medium px-3 py-1.5 rounded transition-colors"
          style={{
            background: 'var(--color-accent-muted)',
            color: 'var(--color-accent-text)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          Open Orbiter Platform
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px" style={{ background: 'var(--color-border-subtle)' }} />
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>or sign in directly</span>
        <div className="flex-1 h-px" style={{ background: 'var(--color-border-subtle)' }} />
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-3 flex-1">
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
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="w-full px-3 py-2 text-sm rounded-md outline-none transition-colors"
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border-default)',
                color: 'var(--color-text-primary)',
                paddingRight: 36,
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                fontSize: 12,
              }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
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
