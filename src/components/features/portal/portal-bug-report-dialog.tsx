'use client';

import { useState, useEffect } from 'react';
import { Bug, CheckCircle } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReportPortalBug } from '@/hooks/queries/use-portal-data';
import { toast } from 'sonner';

interface PortalBugReportDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export function PortalBugReportDialog({
  projectId,
  open,
  onClose,
}: PortalBugReportDialogProps) {
  const reportBug = useReportPortalBug(projectId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'P0' | 'P1' | 'P2' | 'P3'>('P2');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setPriority('P2');
      setSubmitted(false);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const metadata =
      typeof window !== 'undefined'
        ? {
            url: window.location.href,
            browser: navigator.userAgent,
            viewport: { width: window.innerWidth, height: window.innerHeight },
          }
        : undefined;

    reportBug.mutate(
      { title: title.trim(), description: description.trim() || undefined, priority, metadata },
      {
        onSuccess: () => {
          setSubmitted(true);
          toast.success('Bug reported — the team has been notified.');
        },
        onError: (err: unknown) => {
          toast.error(
            (err as { message?: string })?.message ?? 'Could not submit bug',
          );
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface border-[var(--color-border-subtle)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-primary">
            <Bug size={18} weight="duotone" className="text-[var(--color-error)]" />
            Report a Bug
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 rounded-md bg-[var(--color-success-muted)] px-3 py-3">
              <CheckCircle size={18} weight="fill" className="text-[var(--color-success)]" />
              <p className="text-sm text-[var(--color-success)]">
                Reported. You can track it in the Bugs tab.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-primary">
                What went wrong?
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Login button doesn't respond on mobile"
                className="mt-1.5"
                autoFocus
                required
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-primary">
                Steps to reproduce <span className="text-muted">(optional)</span>
              </Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What were you doing? What did you expect vs. what happened?"
                rows={4}
                className="mt-1.5 w-full rounded-md border border-[var(--color-border-default)] bg-surface px-3 py-2 text-sm text-primary placeholder:text-[var(--color-text-muted)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-primary">Severity</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as 'P0' | 'P1' | 'P2' | 'P3')}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P0">Critical — blocks me completely</SelectItem>
                  <SelectItem value="P1">High — major problem</SelectItem>
                  <SelectItem value="P2">Medium — annoying but workable</SelectItem>
                  <SelectItem value="P3">Low — minor / cosmetic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted">
              We&apos;ll automatically include the page URL and your browser info to
              help debug.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!title.trim() || reportBug.isPending}
              >
                {reportBug.isPending ? 'Sending…' : 'Send Report'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
