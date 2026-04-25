'use client';

import { useState, useEffect } from 'react';
import {
  GithubLogo,
  GitCommit,
  GitPullRequest,
  Sparkle,
  CheckCircle,
  CircleNotch,
} from '@phosphor-icons/react';

interface SyncStep {
  label: string;
  icon: React.ReactNode;
  delay: number;
}

const SYNC_STEPS: SyncStep[] = [
  { label: 'Connecting to GitHub', icon: <GithubLogo size={18} weight="fill" />, delay: 0 },
  { label: 'Fetching commits', icon: <GitCommit size={18} />, delay: 1200 },
  { label: 'Fetching pull requests', icon: <GitPullRequest size={18} />, delay: 2800 },
  { label: 'Generating AI summary', icon: <Sparkle size={18} weight="fill" />, delay: 4200 },
];

interface SyncProgressProps {
  isRunning: boolean;
  isComplete: boolean;
  result?: { commitCount?: number; prCount?: number };
}

export function SyncProgress({ isRunning, isComplete, result }: SyncProgressProps) {
  const [activeStep, setActiveStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isRunning) {
      setActiveStep(-1);
      setCompletedSteps(new Set());
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    SYNC_STEPS.forEach((step, i) => {
      timers.push(
        setTimeout(() => setActiveStep(i), step.delay),
      );
      if (i > 0) {
        timers.push(
          setTimeout(() => setCompletedSteps((prev) => new Set([...prev, i - 1])), step.delay),
        );
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [isRunning]);

  useEffect(() => {
    if (isComplete) {
      setCompletedSteps(new Set(SYNC_STEPS.map((_, i) => i)));
      setActiveStep(SYNC_STEPS.length);
    }
  }, [isComplete]);

  if (!isRunning && !isComplete) return null;

  return (
    <div className="rounded-lg border border-subtle bg-surface p-5">
      <div className="space-y-3">
        {SYNC_STEPS.map((step, i) => {
          const isDone = completedSteps.has(i);
          const isActive = activeStep === i && !isDone;
          const isPending = activeStep < i;

          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 transition-all duration-300 ${
                isPending ? 'opacity-30' : 'opacity-100'
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 ${
                isDone
                  ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
                  : isActive
                    ? 'bg-accent-muted text-accent'
                    : 'bg-subtle text-[var(--color-text-muted)]'
              }`}>
                {isDone ? (
                  <CheckCircle size={18} weight="fill" />
                ) : isActive ? (
                  <CircleNotch size={18} className="animate-spin" />
                ) : (
                  step.icon
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium transition-colors duration-300 ${
                  isDone ? 'text-[var(--color-success)]' : isActive ? 'text-primary' : 'text-[var(--color-text-muted)]'
                }`}>
                  {isDone ? `${step.label} ✓` : isActive ? `${step.label}...` : step.label}
                </p>
              </div>
            </div>
          );
        })}

        {isComplete && (
          <div className="mt-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-success-muted)] text-[var(--color-success)]">
              <CheckCircle size={18} weight="fill" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-success)]">Sync complete</p>
              {result && (
                <p className="text-xs text-secondary">
                  {result.commitCount ?? 0} commits, {result.prCount ?? 0} PRs synced
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
