'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { loginSchema, type LoginInput } from '@/modules/auth/auth.validator';
import { useAuth } from '@/hooks/use-auth';

export default function LoginPage() {
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setServerError('');
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setServerError(json.error?.message ?? 'Login failed');
        return;
      }

      setAuth(json.data.user, json.data.accessToken);

      if (json.data.user.role === 'client') {
        router.push('/portal');
      } else {
        router.push('/');
      }
    } catch {
      setServerError('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="rounded-lg border border-subtle bg-surface p-6 shadow-xs">
      <h1 className="text-xl font-semibold tracking-tight text-primary">
        Sign in to Orbiter
      </h1>
      <p className="mt-1 text-sm text-secondary">
        Enter your credentials to continue
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-primary"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-8 w-full rounded-md border border-default bg-surface px-3 text-sm text-primary placeholder:text-muted transition-colors duration-[120ms] ease-out focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-error">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-primary"
            >
              Password
            </label>
            <a
              href="/forgot-password"
              className="text-sm text-accent transition-colors duration-[120ms] ease-out hover:text-accent-hover"
            >
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="h-8 w-full rounded-md border border-default bg-surface px-3 pr-9 text-sm text-primary placeholder:text-muted transition-colors duration-[120ms] ease-out focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-secondary"
              tabIndex={-1}
            >
              {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-error">{errors.password.message}</p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <p className="text-sm text-error">{serverError}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-8 w-full rounded-md bg-accent font-medium text-sm text-white transition-all duration-[120ms] ease-out hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
