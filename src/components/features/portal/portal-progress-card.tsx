'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface PortalProgressCardProps {
  total: number;
  done: number;
  inProgress: number;
  backlog: number;
}

export function PortalProgressCard({ total, done, inProgress, backlog }: PortalProgressCardProps) {
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Project Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Large progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-semibold text-primary">{percentage}%</span>
            <span className="text-sm text-secondary">
              {done} of {total} completed
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-accent-muted">
            <div
              className="h-3 rounded-full bg-accent transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
          </div>
        </div>

        {/* Stat counts */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-subtle bg-subtle/50 px-3 py-2.5 text-center">
            <p className="text-lg font-semibold text-primary">{done}</p>
            <p className="text-xs text-secondary">Completed</p>
          </div>
          <div className="rounded-lg border border-subtle bg-subtle/50 px-3 py-2.5 text-center">
            <p className="text-lg font-semibold text-primary">{inProgress}</p>
            <p className="text-xs text-secondary">Working On</p>
          </div>
          <div className="rounded-lg border border-subtle bg-subtle/50 px-3 py-2.5 text-center">
            <p className="text-lg font-semibold text-primary">{backlog}</p>
            <p className="text-xs text-secondary">Planned</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
