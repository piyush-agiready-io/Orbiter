'use client';

import { useEffect, useState } from 'react';
import { Copy, CheckCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DeviceCodeDisplayProps {
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
}

export function DeviceCodeDisplay({
  userCode,
  verificationUrl,
  expiresIn,
}: DeviceCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(expiresIn);

  // Auto-copy code to clipboard on mount
  useEffect(() => {
    navigator.clipboard.writeText(userCode).then(() => {
      toast.success('Code copied to clipboard');
    });
  }, [userCode]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(userCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-default bg-surface p-6">
      <p className="text-sm text-secondary">
        Enter this code at OpenAI to authorize:
      </p>

      <div className="flex items-center gap-2">
        <code className="rounded-lg bg-subtle px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest text-primary">
          {userCode}
        </code>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {copied ? (
            <CheckCircle size={16} weight="fill" className="text-[var(--color-success)]" />
          ) : (
            <Copy size={16} />
          )}
        </Button>
      </div>

      <a
        href={verificationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-[var(--color-text-inverse)] transition-colors hover:bg-accent-hover"
      >
        Open verification page
      </a>

      <p className="text-xs text-[var(--color-text-muted)]">
        Code expires in {minutes}:{seconds.toString().padStart(2, '0')}
      </p>
    </div>
  );
}
