'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams } from 'next/navigation';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { z } from 'zod';

const resetFormSchema = z
  .object({
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

type ResetFormValues = z.infer<typeof resetFormSchema>;

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetFormSchema),
  });

  async function onSubmit(data: ResetFormValues) {
    setServerError('');
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: params.token,
          password: data.password,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setServerError(json.error?.message ?? 'Invalid or expired reset link');
        return;
      }

      setSuccess(true);
    } catch {
      setServerError('Something went wrong. Please try again.');
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-subtle bg-surface p-6 shadow-xs">
        <h1 className="text-xl font-semibold tracking-tight text-primary">
          Password reset successful
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Your password has been updated. You can now sign in with your new password.
        </p>
        <a
          href="/login"
          className="mt-4 inline-flex h-8 w-full items-center justify-center rounded-md bg-accent font-medium text-sm text-white transition-all duration-[120ms] ease-out hover:bg-accent-hover active:scale-[0.98]"
        >
          Sign in
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-subtle bg-surface p-6 shadow-xs">
      <h1 className="text-xl font-semibold tracking-tight text-primary">
        Reset your password
      </h1>
      <p className="mt-1 text-sm text-secondary">
        Enter your new password below
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-primary"
          >
            New Password
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
            Confirm New Password
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
          {isSubmitting ? 'Resetting...' : 'Reset password'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-secondary">
        <a
          href="/login"
          className="text-accent transition-colors duration-[120ms] ease-out hover:text-accent-hover"
        >
          Back to sign in
        </a>
      </p>
    </div>
  );
}
