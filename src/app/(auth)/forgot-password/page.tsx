'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/modules/auth/auth.validator';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setServerError('');
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setServerError(json.error?.message ?? 'Something went wrong');
        return;
      }

      setSubmitted(true);
    } catch {
      setServerError('Something went wrong. Please try again.');
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-subtle bg-surface p-6 shadow-xs">
        <h1 className="text-xl font-semibold tracking-tight text-primary">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-secondary">
          If an account with that email exists, a password reset link has been sent.
        </p>
        <a
          href="/login"
          className="mt-4 inline-block text-sm text-accent transition-colors duration-[120ms] ease-out hover:text-accent-hover"
        >
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-subtle bg-surface p-6 shadow-xs">
      <h1 className="text-xl font-semibold tracking-tight text-primary">
        Forgot your password?
      </h1>
      <p className="mt-1 text-sm text-secondary">
        Enter your email and we&#39;ll send you a reset link
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
          {isSubmitting ? 'Sending...' : 'Send reset link'}
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
