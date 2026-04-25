'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import {
  ArrowLeft,
  CloudCheck,
  CircleNotch,
  FilePdf,
  Image as ImageIcon,
  FileText,
  DownloadSimple,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { useDoc, useUpdateDoc } from '@/hooks/queries/use-docs';
import { useUsers } from '@/hooks/queries/use-users';
import { DocEditor } from '@/components/features/docs/doc-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface FileContent {
  type: 'file';
  url: string;
  filename: string;
  contentType: string;
  size?: number;
}

interface DocData {
  id: string;
  title: string;
  content: FileContent | Record<string, unknown>;
}

function isFileContent(content: FileContent | Record<string, unknown>): content is FileContent {
  return !!content && (content as Record<string, unknown>).type === 'file' && typeof (content as Record<string, unknown>).url === 'string';
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FilePreview({ content }: { content: FileContent }) {
  const { contentType, url, filename, size } = content;

  if (contentType.startsWith('image/')) {
    return (
      <div className="overflow-hidden rounded-lg border border-[var(--color-border-default)] bg-surface">
        <img src={url} alt={filename} className="mx-auto max-h-[70vh] object-contain" />
        <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] px-4 py-3">
          <div className="flex items-center gap-2">
            <ImageIcon size={16} className="text-[var(--color-info)]" />
            <span className="text-sm text-secondary">{filename}</span>
            {size && <span className="text-xs text-[var(--color-text-muted)]">{formatFileSize(size)}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
              <ArrowSquareOut size={14} data-icon="inline-start" />
              Open
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (contentType === 'application/pdf') {
    return (
      <div className="overflow-hidden rounded-lg border border-[var(--color-border-default)] bg-surface">
        <iframe src={url} className="h-[70vh] w-full border-0" title={filename} />
        <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] px-4 py-3">
          <div className="flex items-center gap-2">
            <FilePdf size={16} className="text-[var(--color-error)]" />
            <span className="text-sm text-secondary">{filename}</span>
            {size && <span className="text-xs text-[var(--color-text-muted)]">{formatFileSize(size)}</span>}
          </div>
          <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
            <ArrowSquareOut size={14} data-icon="inline-start" />
            Open in new tab
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-border-default)] bg-surface px-6 py-16">
      <FileText size={48} className="mb-4 text-[var(--color-text-muted)]" />
      <p className="mb-1 text-sm font-medium text-primary">{filename}</p>
      {size && <p className="mb-4 text-xs text-secondary">{formatFileSize(size)}</p>}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
          <ArrowSquareOut size={14} data-icon="inline-start" />
          Open
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.target = '_blank';
            a.click();
          }}
        >
          <DownloadSimple size={14} data-icon="inline-start" />
          Download
        </Button>
      </div>
    </div>
  );
}

export default function DocDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const docId = params.docId as string;
  const titleSaveTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const contentSaveTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const { data, isLoading } = useDoc(docId);
  const updateDoc = useUpdateDoc(projectId);
  const { data: usersData } = useUsers();
  const mentionUsers = ((usersData as { users?: { id: string; name: string; role: string }[] })?.users ?? [])
    .filter((u) => u.role !== 'client')
    .map((u) => ({ id: u.id, name: u.name }));

  const doc = data as DocData | undefined;

  const handleTitleChange = useCallback(
    (title: string) => {
      if (titleSaveTimeout.current) clearTimeout(titleSaveTimeout.current);
      setSaveStatus('saving');
      titleSaveTimeout.current = setTimeout(() => {
        updateDoc.mutate(
          { docId, data: { title } },
          {
            onSuccess: () => setSaveStatus('saved'),
            onError: () => setSaveStatus('idle'),
          },
        );
      }, 500);
    },
    [docId, updateDoc],
  );

  const handleContentChange = useCallback(
    (json: Record<string, unknown>, plaintext: string) => {
      if (contentSaveTimeout.current) clearTimeout(contentSaveTimeout.current);
      setSaveStatus('saving');
      contentSaveTimeout.current = setTimeout(() => {
        updateDoc.mutate(
          { docId, data: { content: json, contentPlaintext: plaintext } },
          {
            onSuccess: () => setSaveStatus('saved'),
            onError: () => setSaveStatus('idle'),
          },
        );
      }, 800);
    },
    [docId, updateDoc],
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-secondary">Document not found</p>
      </div>
    );
  }

  const isFile = isFileContent(doc.content);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/projects/${projectId}/docs`)}
        >
          <ArrowLeft size={14} data-icon="inline-start" />
          Back to docs
        </Button>
        {saveStatus !== 'idle' && (
          <span className="flex items-center gap-1.5 text-xs text-secondary">
            {saveStatus === 'saving' ? (
              <>
                <CircleNotch size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CloudCheck size={14} />
                Saved
              </>
            )}
          </span>
        )}
      </div>
      <Input
        defaultValue={doc.title}
        onChange={(e) => handleTitleChange(e.target.value)}
        className="mb-4 border-none bg-transparent px-0 text-xl font-semibold text-primary shadow-none outline-none focus-visible:ring-0"
        placeholder="Untitled"
      />
      {isFile ? (
        <FilePreview content={doc.content as FileContent} />
      ) : (
        <DocEditor
          content={(doc.content as Record<string, unknown>) ?? {}}
          onChange={handleContentChange}
          mentionUsers={mentionUsers}
        />
      )}
    </div>
  );
}
