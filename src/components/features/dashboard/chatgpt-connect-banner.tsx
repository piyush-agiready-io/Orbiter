'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Robot, X } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/use-auth';
import { useOpenAIConnectionStatus } from '@/hooks/queries/use-openai-connection';

const DISMISS_KEY = 'orbiter:chatgpt-banner-dismissed';

export function ChatGPTConnectBanner() {
  const { user } = useAuth();
  const { data: status, isLoading } = useOpenAIConnectionStatus();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  if (user?.role !== 'admin') return null;
  if (isLoading) return null;
  if (status?.connected) return null;
  if (dismissed) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-accent/30 bg-accent-muted/40 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-[var(--color-text-inverse)]">
        <Robot size={18} weight="duotone" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-primary">
          Unlock AI features — connect ChatGPT
        </p>
        <p className="mt-0.5 text-sm text-secondary">
          Auto-detect priorities, sprint suggestions, and GitHub digests.
          Uses your existing ChatGPT subscription — no extra API cost.
        </p>
        <Link
          href="/settings/chatgpt"
          className="mt-2 inline-flex items-center text-sm font-medium text-accent hover:underline"
        >
          Connect ChatGPT →
        </Link>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, '1');
          setDismissed(true);
        }}
        className="shrink-0 rounded-md p-1 text-muted hover:bg-subtle hover:text-primary"
      >
        <X size={14} />
      </button>
    </div>
  );
}
