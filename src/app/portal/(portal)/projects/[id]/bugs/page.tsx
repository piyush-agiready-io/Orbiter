'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Bug } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePortalBugs } from '@/hooks/queries/use-portal-data';
import { PortalBugReportDialog } from '@/components/features/portal/portal-bug-report-dialog';

const PRIORITY_TINT: Record<string, string> = {
  P0: 'bg-[var(--color-error-muted)] text-[var(--color-error)]',
  P1: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
  P2: 'bg-[var(--color-info-muted)] text-[var(--color-info)]',
  P3: 'bg-subtle text-secondary',
};

const STATUS_TINT: Record<string, string> = {
  open: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
  investigating: 'bg-[var(--color-info-muted)] text-[var(--color-info)]',
  resolved: 'bg-[var(--color-success-muted)] text-[var(--color-success)]',
  closed: 'bg-subtle text-secondary',
};

export default function PortalBugsPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = usePortalBugs(params.id);
  const [dialogOpen, setDialogOpen] = useState(false);

  const bugs = data?.bugs ?? [];

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-primary">Bug Reports</h2>
          <p className="text-sm text-secondary">
            Bugs you&apos;ve reported on this project. The team is notified
            immediately.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Bug size={16} className="mr-1.5" />
          Report a Bug
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {bugs.length === 0
              ? 'No bugs reported yet'
              : `${bugs.length} bug${bugs.length === 1 ? '' : 's'} reported`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-md bg-subtle"
                />
              ))}
            </div>
          ) : bugs.length === 0 ? (
            <div className="py-8 text-center">
              <Bug
                size={32}
                className="mx-auto mb-2 text-[var(--color-text-muted)]"
              />
              <p className="text-sm text-muted">
                Find something off while testing? Report it and the team can
                pick it up.
              </p>
              <Button className="mt-3" onClick={() => setDialogOpen(true)}>
                Report your first bug
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-subtle">
              {bugs.map((bug) => (
                <li key={bug.id} className="flex items-start gap-3 py-3">
                  <Badge
                    className={`shrink-0 ${PRIORITY_TINT[bug.priority] ?? ''}`}
                  >
                    {bug.priority}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary">
                      {bug.title}
                    </p>
                    {bug.description && (
                      <p className="mt-0.5 text-xs text-secondary line-clamp-2">
                        {bug.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted">
                      Reported {format(new Date(bug.createdAt), 'MMM d, yyyy')}
                      {bug.metadata?.url ? ` · on ${bug.metadata.url}` : ''}
                    </p>
                  </div>
                  <Badge
                    className={`shrink-0 capitalize ${STATUS_TINT[bug.status] ?? ''}`}
                  >
                    {bug.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <PortalBugReportDialog
        projectId={params.id}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
