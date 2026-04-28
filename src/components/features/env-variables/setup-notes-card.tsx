'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Notepad, PencilSimple, X } from '@phosphor-icons/react';
import { api } from '@/shared/lib/api-client';
import { Button } from '@/components/ui/button';
import { useProject } from '@/hooks/queries/use-projects';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface ProjectShape {
  setupNotes?: string;
}

export function SetupNotesCard({ projectId }: { projectId: string }) {
  const { data } = useProject(projectId);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'internal';

  const project = data as ProjectShape | undefined;
  const notes = project?.setupNotes ?? '';

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes);

  useEffect(() => {
    if (!editing) setDraft(notes);
  }, [notes, editing]);

  const saveNotes = useMutation({
    mutationFn: (setupNotes: string) =>
      api.patch(`/projects/${projectId}`, { setupNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setEditing(false);
      toast.success('Setup notes saved');
    },
    onError: () => toast.error('Could not save setup notes'),
  });

  if (!editing && !notes && !canEdit) return null;

  return (
    <div className="mb-6 rounded-lg border border-subtle bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Notepad size={16} className="text-secondary" />
          <h3 className="text-sm font-semibold text-primary">Setup Notes</h3>
        </div>
        {canEdit && !editing && (
          <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
            <PencilSimple size={12} className="mr-1" />
            {notes ? 'Edit' : 'Add notes'}
          </Button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            placeholder={`Steps to set up this project locally.\n\nExample:\n  pnpm install\n  cp .env.example .env.local\n  pnpm dev`}
            className="w-full resize-y rounded-md border border-[var(--color-border-default)] bg-surface px-3 py-2 font-mono text-xs text-primary placeholder:text-[var(--color-text-muted)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(notes);
                setEditing(false);
              }}
              disabled={saveNotes.isPending}
            >
              <X size={12} className="mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => saveNotes.mutate(draft.trim())}
              disabled={saveNotes.isPending || draft === notes}
            >
              {saveNotes.isPending ? 'Saving…' : 'Save notes'}
            </Button>
          </div>
        </div>
      ) : notes ? (
        <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-secondary">
          {notes}
        </pre>
      ) : (
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          No setup notes yet. Add commands or instructions for spinning this project up.
        </p>
      )}
    </div>
  );
}
