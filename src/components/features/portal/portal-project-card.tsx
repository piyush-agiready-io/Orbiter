'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-[var(--color-success-muted)] text-[var(--color-success)]' },
  planning: { label: 'Planning', className: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]' },
  paused: { label: 'Paused', className: 'bg-subtle text-secondary' },
  completed: { label: 'Completed', className: 'bg-accent-muted text-[var(--color-accent-text)]' },
};

interface PortalProjectCardProps {
  project: {
    id: string;
    name: string;
    status?: string;
    progress?: number;
  };
}

export function PortalProjectCard({ project }: PortalProjectCardProps) {
  const status = project.status ?? 'active';
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
  const progress = project.progress ?? 0;

  return (
    <Link href={`/projects/${project.id}`} className="block">
      <Card className="transition-shadow duration-[120ms] hover:shadow-sm">
        <CardHeader>
          <CardTitle>{project.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge variant="secondary" className={config.className}>
            {config.label}
          </Badge>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-secondary">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-accent-muted">
              <div
                className="h-2 rounded-full bg-accent transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
