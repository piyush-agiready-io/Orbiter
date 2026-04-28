'use client';

import { useEffect, useState } from 'react';
import { Sparkle, CircleNotch } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface AiDescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  suggestion: string | null;
  onConfirm: (description: string) => void;
  saving?: boolean;
}

export function AiDescriptionDialog({
  open,
  onOpenChange,
  loading,
  suggestion,
  onConfirm,
  saving = false,
}: AiDescriptionDialogProps) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (open) setText(suggestion ?? '');
  }, [open, suggestion]);

  const canSave = text.trim().length > 0 && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-[var(--color-border-subtle)] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-muted)]">
              <Sparkle size={18} weight="fill" className="text-accent" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-primary">
                Suggested project description
              </DialogTitle>
              <p className="mt-1 text-sm text-secondary">
                Generated from this repository&apos;s README. Edit before saving, or skip.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2">
          {loading ? (
            <div className="flex items-center gap-2 rounded-md border border-subtle bg-subtle/40 px-3 py-4 text-sm text-secondary">
              <CircleNotch size={14} className="animate-spin text-accent" />
              Reading README and writing a summary…
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Describe what this project does"
              className="w-full rounded-md border border-[var(--color-border-default)] bg-surface px-3 py-2 text-sm text-primary placeholder:text-[var(--color-text-muted)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Skip
          </Button>
          <Button
            onClick={() => onConfirm(text.trim())}
            disabled={!canSave || loading}
          >
            {saving ? 'Saving…' : 'Use this description'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
