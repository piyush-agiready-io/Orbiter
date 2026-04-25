'use client';

import Link from 'next/link';
import { Sparkle } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/use-auth';

interface AiNotConnectedProps {
  feature?: string;
  compact?: boolean;
}

export function AiNotConnected({ feature = 'AI features', compact = false }: AiNotConnectedProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-[var(--color-warning-muted)] px-3 py-2 text-xs text-[var(--color-warning)]">
        <Sparkle size={14} />
        <span>{feature} requires ChatGPT connection.</span>
        {isAdmin && (
          <Link href="/settings/chatgpt" className="font-medium underline">
            Connect
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--color-warning)]/20 bg-[var(--color-warning-muted)] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-warning)]/10">
          <Sparkle size={16} weight="fill" className="text-[var(--color-warning)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">{feature} unavailable</p>
          <p className="mt-0.5 text-xs text-secondary">
            {isAdmin
              ? 'Connect your ChatGPT account to enable AI-powered features across the platform.'
              : 'Ask your admin to connect ChatGPT in Settings to enable AI features.'}
          </p>
          {isAdmin && (
            <Link
              href="/settings/chatgpt"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
            >
              <Sparkle size={12} />
              Connect ChatGPT
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
