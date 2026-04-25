'use client';

import { useParams } from 'next/navigation';
import {
  Globe,
  FigmaLogo,
  GitBranch,
  BookOpen,
  Flask,
  LinkSimple,
} from '@phosphor-icons/react';
import { usePortalLinks } from '@/hooks/queries/use-portal-data';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const LINK_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  production: { label: 'Production', icon: <Globe size={16} />, color: 'bg-[var(--color-success-muted)] text-[var(--color-success)]' },
  staging: { label: 'Staging', icon: <Flask size={16} />, color: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]' },
  figma: { label: 'Figma', icon: <FigmaLogo size={16} />, color: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]' },
  api_docs: { label: 'API Docs', icon: <BookOpen size={16} />, color: 'bg-[var(--color-info-muted)] text-[var(--color-info)]' },
  repository: { label: 'Repository', icon: <GitBranch size={16} />, color: 'bg-subtle text-secondary' },
  other: { label: 'Other', icon: <LinkSimple size={16} />, color: 'bg-subtle text-secondary' },
};

interface LinkItem {
  id: string;
  label: string;
  url: string;
  type: string;
}

export default function PortalLinksPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = usePortalLinks(params.id);

  const links: LinkItem[] =
    (data as { links?: LinkItem[] })?.links ??
    (Array.isArray(data) ? (data as LinkItem[]) : []);

  return (
    <div className="p-6">
      <h2 className="text-h2 font-semibold text-primary">Links</h2>

      {isLoading ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-subtle" />
          ))}
        </div>
      ) : links.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <LinkSimple size={32} className="mb-3 text-[var(--color-text-muted)]" />
          <p className="text-sm text-secondary">No links available</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => {
            const config = LINK_TYPE_CONFIG[link.type] ?? LINK_TYPE_CONFIG.other;
            return (
              <Card key={link.id} size="sm">
                <CardHeader>
                  <CardTitle>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-[var(--color-accent-text)]"
                    >
                      <span className="shrink-0">{config.icon}</span>
                      <span className="truncate">{link.label}</span>
                    </a>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className={config.color}>
                    {config.label}
                  </Badge>
                  <p className="mt-1.5 truncate text-xs text-[var(--color-text-muted)]">
                    {link.url}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
