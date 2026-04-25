'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  Eye,
  EyeSlash,
  Trash,
  Copy,
  Key,
  ClockCounterClockwise,
  UploadSimple,
  DownloadSimple,
  CircleNotch,
} from '@phosphor-icons/react';
import { InfoTip } from '@/components/shared/info-tip';
import {
  useEnvVariables,
  useCreateEnvVariable,
  useDeleteEnvVariable,
  useRevealEnvVariable,
  useExportEnv,
  useEnvAuditLog,
} from '@/hooks/queries/use-env-variables';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { toast } from 'sonner';

interface EnvVarItem {
  id: string;
  key: string;
  environment: string;
  updatedAt: string;
}

interface AuditLogItem {
  id: string;
  userId: { name: string; email: string };
  action: string;
  targetKey: string;
  environment: string;
  createdAt: string;
}

const ENV_BADGE_COLORS: Record<string, string> = {
  dev: 'bg-[var(--color-info-muted)] text-[var(--color-info)]',
  prod: 'bg-[var(--color-error-muted)] text-[var(--color-error)]',
};

const ACTION_LABELS: Record<string, string> = {
  env_create: 'Created',
  env_update: 'Updated',
  env_delete: 'Deleted',
  env_reveal: 'Revealed',
  env_export: 'Exported',
};

function parseEnvFile(content: string): { key: string; value: string }[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const eqIndex = line.indexOf('=');
      if (eqIndex === -1) return null;
      const key = line.slice(0, eqIndex).trim();
      const value = line.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
      return { key, value };
    })
    .filter(Boolean) as { key: string; value: string }[];
}

function downloadEnvFile(content: string, environment: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `.env.${environment}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function EnvTable() {
  const params = useParams();
  const projectId = params.id as string;
  const [activeEnv, setActiveEnv] = useState('dev');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({ key: '', value: '', environment: 'dev' });
  const [importProgress, setImportProgress] = useState<{ total: number; done: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useEnvVariables(projectId, activeEnv);
  const createEnvVar = useCreateEnvVariable(projectId);
  const deleteEnvVar = useDeleteEnvVariable(projectId);
  const revealEnvVar = useRevealEnvVariable();
  const exportEnv = useExportEnv(projectId);
  const { data: auditData } = useEnvAuditLog(projectId);

  const envVars: EnvVarItem[] = (data as { envVars?: EnvVarItem[] })?.envVars ?? [];
  const auditLogs: AuditLogItem[] = (auditData as { logs?: AuditLogItem[] })?.logs ?? [];

  const handleCreate = () => {
    if (!formData.key.trim()) return;
    createEnvVar.mutate(formData, {
      onSuccess: () => {
        setFormData({ key: '', value: '', environment: activeEnv });
        setDialogOpen(false);
      },
    });
  };

  const handleReveal = async (envVar: EnvVarItem) => {
    if (revealedValues[envVar.id]) {
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[envVar.id];
        return next;
      });
      return;
    }
    revealEnvVar.mutate(envVar.id, {
      onSuccess: (result) => {
        const data = result as { value: string };
        setRevealedValues((prev) => ({ ...prev, [envVar.id]: data.value }));
      },
    });
  };

  const handleExport = () => {
    exportEnv.mutate(activeEnv, {
      onSuccess: (result) => {
        const data = result as { content: string };
        navigator.clipboard.writeText(data.content);
        toast.success('Copied .env to clipboard');
      },
    });
  };

  const handleDownloadEnv = () => {
    exportEnv.mutate(activeEnv, {
      onSuccess: (result) => {
        const data = result as { content: string };
        downloadEnvFile(data.content, activeEnv);
        toast.success(`Downloaded .env.${activeEnv}`);
      },
    });
  };

  const handleEnvFileUpload = async (file: File) => {
    const content = await file.text();
    const vars = parseEnvFile(content);

    if (vars.length === 0) {
      toast.error('No valid variables found in file');
      return;
    }

    setImportProgress({ total: vars.length, done: 0 });

    let done = 0;
    let errors = 0;

    for (const { key, value } of vars) {
      try {
        await new Promise<void>((resolve, reject) => {
          createEnvVar.mutate(
            { key, value, environment: activeEnv },
            {
              onSuccess: () => resolve(),
              onError: () => reject(),
            },
          );
        });
        done++;
      } catch {
        errors++;
        done++;
      }
      setImportProgress({ total: vars.length, done });
    }

    setImportProgress(null);

    if (errors > 0) {
      toast.warning(`Imported ${vars.length - errors}/${vars.length} variables (${errors} failed)`);
    } else {
      toast.success(`Imported ${vars.length} variables`);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".env,.env.*,text/plain"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleEnvFileUpload(file);
          e.target.value = '';
        }}
      />

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-h2 font-semibold text-primary">Environment Variables</h2>
          <InfoTip text="Store secrets like API keys and database URLs. Values are AES-256 encrypted. Use Dev for development and Prod for production." />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAudit(!showAudit)}
          >
            <ClockCounterClockwise size={14} data-icon="inline-start" />
            {showAudit ? 'Variables' : 'Audit Log'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Copy size={14} data-icon="inline-start" />
            Copy as .env
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadEnv}>
            <DownloadSimple size={14} data-icon="inline-start" />
            Download .env
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importProgress !== null}
          >
            {importProgress ? (
              <>
                <CircleNotch size={14} className="animate-spin" data-icon="inline-start" />
                Importing {importProgress.done}/{importProgress.total}...
              </>
            ) : (
              <>
                <UploadSimple size={14} data-icon="inline-start" />
                Upload .env
              </>
            )}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus size={14} data-icon="inline-start" />
              Add Variable
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Environment Variable</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="mb-1.5">Key</Label>
                  <Input
                    placeholder="DATABASE_URL"
                    value={formData.key}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, key: e.target.value.toUpperCase() }))
                    }
                    className="font-mono"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="mb-1.5">Value</Label>
                  <Input
                    placeholder="Enter value..."
                    type="password"
                    value={formData.value}
                    onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label className="mb-1.5">Environment</Label>
                  <Select
                    value={formData.environment}
                    onValueChange={(val) => {
                      if (val) setFormData((prev) => ({ ...prev, environment: val }));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dev">Development</SelectItem>
                      <SelectItem value="prod">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter showCloseButton>
                <Button onClick={handleCreate} disabled={!formData.key.trim()}>
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showAudit ? (
        <div className="rounded-lg border border-default">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-default bg-subtle">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Action
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Key
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Env
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  User
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  When
                </th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-[var(--color-border-subtle)]">
                  <td className="px-4 py-2.5">{ACTION_LABELS[log.action] ?? log.action}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{log.targetKey}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary" className={ENV_BADGE_COLORS[log.environment]}>
                      {log.environment}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-secondary">{log.userId?.name ?? 'Unknown'}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)]">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-secondary">
                    No audit log entries
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <Tabs value={activeEnv} onValueChange={(v) => v && setActiveEnv(v)}>
            <TabsList variant="line">
              <TabsTrigger value="dev">Development</TabsTrigger>
              <TabsTrigger value="prod">Production</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-4 rounded-lg border border-default">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-default bg-subtle">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                    Key
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                    Value
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                    Updated
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td colSpan={4} className="px-4 py-3">
                        <div className="h-5 animate-pulse rounded bg-subtle" />
                      </td>
                    </tr>
                  ))
                ) : envVars.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <Key size={24} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
                      <p className="text-sm text-secondary">
                        No variables in {activeEnv}
                      </p>
                    </td>
                  </tr>
                ) : (
                  envVars.map((envVar) => (
                    <tr
                      key={envVar.id}
                      className="group border-b border-[var(--color-border-subtle)] transition-colors hover:bg-subtle"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-medium">
                        {envVar.key}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-muted)]">
                        {revealedValues[envVar.id] ?? '••••••••'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
                        {formatDistanceToNow(new Date(envVar.updatedAt), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleReveal(envVar)}
                          >
                            {revealedValues[envVar.id] ? (
                              <EyeSlash size={14} />
                            ) : (
                              <Eye size={14} />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-[var(--color-error)] opacity-0 group-hover:opacity-100"
                            onClick={() => deleteEnvVar.mutate(envVar.id)}
                          >
                            <Trash size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
