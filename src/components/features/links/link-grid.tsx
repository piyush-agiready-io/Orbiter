'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Plus,
  Globe,
  FigmaLogo,
  GitBranch,
  BookOpen,
  Flask,
  LinkSimple,
  Pencil,
  Trash,
} from '@phosphor-icons/react';
import { useLinks, useCreateLink, useUpdateLink, useDeleteLink } from '@/hooks/queries/use-links';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const LINK_TYPE_OPTIONS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  production: { label: 'Production', icon: <Globe size={16} />, color: 'bg-[var(--color-success-muted)] text-[var(--color-success)]' },
  staging: { label: 'Staging', icon: <Flask size={16} />, color: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]' },
  figma: { label: 'Figma', icon: <FigmaLogo size={16} />, color: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]' },
  api_docs: { label: 'API Docs', icon: <BookOpen size={16} />, color: 'bg-[var(--color-info-muted)] text-[var(--color-info)]' },
  repository: { label: 'Repository', icon: <GitBranch size={16} />, color: 'bg-subtle text-secondary' },
};

const FALLBACK_CONFIG = { label: 'Custom', icon: <LinkSimple size={16} />, color: 'bg-subtle text-secondary' };

function getLinkTypeConfig(type: string) {
  return LINK_TYPE_OPTIONS[type] ?? { ...FALLBACK_CONFIG, label: type };
}

interface LinkItem {
  id: string;
  label: string;
  url: string;
  type: string;
}

export function LinkGrid() {
  const params = useParams();
  const projectId = params.id as string;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [formData, setFormData] = useState({ label: '', url: '', type: 'production' });
  const [showCustomType, setShowCustomType] = useState(false);
  const [customTypeValue, setCustomTypeValue] = useState('');

  const { data, isLoading } = useLinks(projectId);
  const createLink = useCreateLink(projectId);
  const updateLink = useUpdateLink(projectId);
  const deleteLink = useDeleteLink(projectId);

  const links: LinkItem[] = (data as { links?: LinkItem[] })?.links ?? [];

  const resetForm = () => {
    setFormData({ label: '', url: '', type: 'production' });
    setEditingLink(null);
    setShowCustomType(false);
    setCustomTypeValue('');
    setDialogOpen(false);
  };

  const handleSubmit = () => {
    if (!formData.label.trim() || !formData.url.trim()) return;
    if (editingLink) {
      updateLink.mutate(
        { linkId: editingLink.id, data: formData },
        { onSuccess: resetForm },
      );
    } else {
      createLink.mutate(formData, { onSuccess: resetForm });
    }
  };

  const openEdit = (link: LinkItem) => {
    setEditingLink(link);
    const isKnownType = link.type in LINK_TYPE_OPTIONS;
    setFormData({ label: link.label, url: link.url, type: isKnownType ? link.type : link.type });
    if (!isKnownType) {
      setShowCustomType(true);
      setCustomTypeValue(link.type);
    } else {
      setShowCustomType(false);
      setCustomTypeValue('');
    }
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-h2 font-semibold text-primary">Links</h2>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) resetForm();
            setDialogOpen(open);
          }}
        >
          <DialogTrigger render={<Button />}>
            <Plus size={16} data-icon="inline-start" />
            Add Link
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLink ? 'Edit Link' : 'Add Link'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="mb-1.5">Label</Label>
                <Input
                  placeholder="e.g. Production App"
                  value={formData.label}
                  onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <Label className="mb-1.5">URL</Label>
                <Input
                  placeholder="https://..."
                  value={formData.url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1.5">Type</Label>
                {!showCustomType ? (
                  <>
                    <Select
                      value={formData.type in LINK_TYPE_OPTIONS ? formData.type : ''}
                      onValueChange={(val) => { if (val) setFormData((prev) => ({ ...prev, type: val })); }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LINK_TYPE_OPTIONS).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => setShowCustomType(true)}
                      className="mt-1 text-xs text-[var(--color-accent-text)] hover:underline"
                    >
                      + Custom type
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      value={customTypeValue}
                      onChange={(e) => setCustomTypeValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customTypeValue.trim()) {
                          e.preventDefault();
                          setFormData((prev) => ({ ...prev, type: customTypeValue.trim() }));
                        }
                      }}
                      placeholder="Type and press Enter"
                      className="mt-1 h-9 w-full rounded-md border border-[var(--color-border-default)] bg-surface px-2 text-sm text-primary placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20"
                      autoFocus
                    />
                    {formData.type && !(formData.type in LINK_TYPE_OPTIONS) && (
                      <p className="mt-1 text-xs text-secondary">
                        Custom type: <span className="font-medium text-primary">{formData.type}</span>
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomType(false);
                        setCustomTypeValue('');
                        if (!(formData.type in LINK_TYPE_OPTIONS)) {
                          setFormData((prev) => ({ ...prev, type: 'production' }));
                        }
                      }}
                      className="mt-1 text-xs text-[var(--color-text-muted)] hover:underline"
                    >
                      Use preset type
                    </button>
                  </>
                )}
              </div>
            </div>
            <DialogFooter showCloseButton>
              <Button
                onClick={handleSubmit}
                disabled={!formData.label.trim() || !formData.url.trim()}
              >
                {editingLink ? 'Save' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-subtle" />
          ))}
        </div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <LinkSimple size={32} className="mb-3 text-[var(--color-text-muted)]" />
          <p className="text-sm text-secondary">No links yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => {
            const config = getLinkTypeConfig(link.type);
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
                  <CardAction>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
                        <Pencil size={14} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(link)}>
                          <Pencil size={14} />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-[var(--color-error)]"
                          onClick={() => deleteLink.mutate(link.id)}
                        >
                          <Trash size={14} />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardAction>
                </CardHeader>
                <div className="px-3 pb-3">
                  <Badge variant="secondary" className={config.color}>
                    {config.label}
                  </Badge>
                  <p className="mt-1.5 truncate text-xs text-[var(--color-text-muted)]">
                    {link.url}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
