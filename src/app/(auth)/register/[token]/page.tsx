'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useRouter } from 'next/navigation';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';

const registerFormSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function RegisterPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { setAuth } = useAuth();
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
  });

  async function onSubmit(data: RegisterFormValues) {
    setServerError('');
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          password: data.password,
          inviteToken: params.token,
        }),
        credentials: 'include',
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setServerError(json.error?.message ?? 'Invalid or expired invite link');
        return;
      }

      setAuth(json.data.user, json.data.accessToken);

      if (json.data.user.role === 'client') {
        router.replace('/portal');
      } else {
        router.replace('/');
      }
    } catch {
      setServerError('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="rounded-lg border border-subtle bg-surface p-6 shadow-xs">
      <h1 className="text-xl font-semibold tracking-tight text-primary">
        Complete your registration
      </h1>
      <p className="mt-1 text-sm text-secondary">
        Set up your name and password to get started
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-primary"
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            className="h-8 w-full rounded-md border border-default bg-surface px-3 text-sm text-primary placeholder:text-muted transition-colors duration-[120ms] ease-out focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-error">{errors.name.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-primary"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
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

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-primary"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              className="h-8 w-full rounded-md border border-default bg-surface px-3 pr-9 text-sm text-primary placeholder:text-muted transition-colors duration-[120ms] ease-out focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-secondary"
              tabIndex={-1}
            >
              {showConfirm ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-error">{errors.confirmPassword.message}</p>
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
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-secondary">
        Already have an account?{' '}
        <a
          href="/login"
          className="text-accent transition-colors duration-[120ms] ease-out hover:text-accent-hover"
        >
          Sign in
        </a>
      </p>
    </div>
  );
}
