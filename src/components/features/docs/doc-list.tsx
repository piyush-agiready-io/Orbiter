'use client';

import { useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import Avatar from 'boring-avatars';
import {
  Plus,
  MagnifyingGlass,
  File,
  FilePdf,
  Image as ImageIcon,
  FileText,
  DotsThree,
  Trash,
  CloudArrowUp,
  CircleNotch,
  DownloadSimple,
  PencilSimple,
  Paperclip,
} from '@phosphor-icons/react';
import { useDocs, useSearchDocs, useCreateDoc, useDeleteDoc } from '@/hooks/queries/use-docs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { InfoTip } from '@/components/shared/info-tip';

interface DocContent {
  type: 'file' | 'doc';
  url?: string;
  filename?: string;
  contentType?: string;
  size?: number;
}

interface DocItem {
  id: string;
  title: string;
  content: DocContent;
  contentPlaintext: string;
  author: { name: string; email: string };
  updatedAt: string;
}

type CreateMode = 'write' | 'upload';

function getFileTypeIcon(contentType?: string) {
  if (!contentType) return <File size={20} className="text-[var(--color-text-muted)]" />;
  if (contentType === 'application/pdf') return <FilePdf size={20} className="text-[var(--color-error)]" />;
  if (contentType.startsWith('image/')) return <ImageIcon size={20} className="text-[var(--color-info)]" />;
  return <FileText size={20} className="text-[var(--color-text-muted)]" />;
}

function isImageType(contentType?: string): boolean {
  return !!contentType && contentType.startsWith('image/');
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: globalThis.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:...;base64, prefix to get raw base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function DocList() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>('write');
  const [newTitle, setNewTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: listData, isLoading } = useDocs(projectId);
  const { data: searchData } = useSearchDocs(projectId, searchQuery);
  const createDoc = useCreateDoc(projectId);
  const deleteDoc = useDeleteDoc(projectId);

  const docs: DocItem[] =
    searchQuery.length > 0
      ? ((searchData as { docs?: DocItem[] })?.docs ?? [])
      : ((listData as { docs?: DocItem[] })?.docs ?? []);

  const handleFileSelect = useCallback((file: globalThis.File) => {
    setSelectedFile(file);
    if (!newTitle.trim()) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  }, [newTitle]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // Write mode: create a blank rich text doc and navigate to editor
  const handleCreateWriteDoc = async () => {
    if (!newTitle.trim()) return;

    createDoc.mutate(
      {
        title: newTitle.trim(),
        content: { type: 'doc', content: [] },
        contentPlaintext: '',
      },
      {
        onSuccess: (data) => {
          const newDoc = data as { id: string };
          setNewTitle('');
          setDialogOpen(false);
          router.push(`/projects/${projectId}/docs/${newDoc.id}`);
        },
        onError: () => {
          toast.error('Failed to create document');
        },
      },
    );
  };

  // Upload mode: upload file then create doc
  const handleUploadAndCreate = async () => {
    if (!newTitle.trim() || !selectedFile) return;
    setUploading(true);

    try {
      const token = (await import('@/hooks/use-auth')).useAuth.getState().accessToken;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      // First try R2 presigned URL upload
      const presignRes = await fetch('/api/v1/upload', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type || 'application/octet-stream',
        }),
      });
      const presignJson = await presignRes.json();

      let publicUrl: string;

      if (presignJson.success && presignJson.data?.uploadUrl) {
        // R2 is configured — upload to presigned URL
        try {
          const putRes = await fetch(presignJson.data.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': selectedFile.type || 'application/octet-stream' },
            body: selectedFile,
          });
          if (!putRes.ok) {
            throw new Error(`R2 PUT failed: ${putRes.status}`);
          }
          publicUrl = presignJson.data.publicUrl;
        } catch (r2Err) {
          console.warn('[doc-upload] R2 PUT failed, falling back to base64:', r2Err);
          // R2 PUT failed (likely CORS) — fall back to base64
          publicUrl = await uploadViaBase64Fallback(selectedFile, headers);
        }
      } else {
        // R2 not configured or presign failed — use base64 fallback
        console.warn('[doc-upload] R2 presign unavailable, using base64 fallback');
        publicUrl = await uploadViaBase64Fallback(selectedFile, headers);
      }

      const fileContent: DocContent = {
        type: 'file',
        url: publicUrl,
        filename: selectedFile.name,
        contentType: selectedFile.type || 'application/octet-stream',
        size: selectedFile.size,
      };

      createDoc.mutate(
        {
          title: newTitle.trim(),
          content: fileContent as unknown as Record<string, unknown>,
          contentPlaintext: selectedFile.name,
        },
        {
          onSuccess: () => {
            setNewTitle('');
            setSelectedFile(null);
            setDialogOpen(false);
            toast.success('Document uploaded');
          },
          onError: () => {
            toast.error('Failed to create document');
          },
        },
      );
    } catch (err) {
      console.error('[doc-upload] Upload failed:', err);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Base64 fallback: convert file to base64 and send to upload endpoint
  async function uploadViaBase64Fallback(
    file: globalThis.File,
    headers: Record<string, string>,
  ): Promise<string> {
    const base64Data = await fileToBase64(file);

    const fallbackRes = await fetch('/api/v1/upload', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        base64Data,
      }),
    });
    const fallbackJson = await fallbackRes.json();
    if (!fallbackJson.success) {
      throw new Error(fallbackJson.error?.message ?? 'Base64 fallback upload failed');
    }
    return fallbackJson.data.publicUrl;
  }

  const handleDocClick = (doc: DocItem) => {
    if (doc.content?.type === 'file' && doc.content.url) {
      // For base64 data URLs, open in the doc detail page instead
      if (doc.content.url.startsWith('data:')) {
        router.push(`/projects/${projectId}/docs/${doc.id}`);
      } else {
        window.open(doc.content.url, '_blank');
      }
    } else {
      router.push(`/projects/${projectId}/docs/${doc.id}`);
    }
  };

  const resetDialog = () => {
    setNewTitle('');
    setSelectedFile(null);
    setDragOver(false);
    setCreateMode('write');
  };

  const handleCreate = () => {
    if (createMode === 'write') {
      handleCreateWriteDoc();
    } else {
      handleUploadAndCreate();
    }
  };

  const isCreateDisabled =
    createMode === 'write'
      ? !newTitle.trim() || createDoc.isPending
      : !newTitle.trim() || !selectedFile || uploading;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-h2 font-semibold text-primary">Docs</h2>
        <InfoTip text="Write rich text documents or upload files (PDF, images, etc.). Docs are project-scoped and searchable." />
      </div>
      <div className="mb-6 flex items-center justify-between">
        <div className="relative w-64">
          <MagnifyingGlass
            size={16}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <Input
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetDialog();
          }}
        >
          <DialogTrigger render={<Button />}>
            <Plus size={16} data-icon="inline-start" />
            New Doc
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex rounded-lg border border-[var(--color-border-subtle)] bg-subtle p-1">
                <button
                  type="button"
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    createMode === 'write'
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-secondary hover:text-primary'
                  }`}
                  onClick={() => setCreateMode('write')}
                >
                  <PencilSimple size={16} />
                  Write
                </button>
                <button
                  type="button"
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    createMode === 'upload'
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-secondary hover:text-primary'
                  }`}
                  onClick={() => setCreateMode('upload')}
                >
                  <Paperclip size={16} />
                  Upload
                </button>
              </div>

              {/* Title input */}
              <div>
                <Label className="mb-1.5">Title</Label>
                <Input
                  placeholder="Document title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && createMode === 'write' && newTitle.trim()) {
                      handleCreateWriteDoc();
                    }
                  }}
                />
              </div>

              {/* Upload zone — only shown in upload mode */}
              {createMode === 'upload' && (
                <div>
                  <Label className="mb-1.5">File</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.svg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                  <div
                    className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                      dragOver
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]'
                        : selectedFile
                          ? 'border-[var(--color-border-default)] bg-surface'
                          : 'border-[var(--color-border-subtle)] bg-subtle hover:border-[var(--color-border-default)]'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    {selectedFile ? (
                      <div className="flex items-center gap-3 px-4 py-3">
                        {getFileTypeIcon(selectedFile.type)}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-primary">{selectedFile.name}</p>
                          <p className="text-xs text-secondary">{formatFileSize(selectedFile.size)}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <CloudArrowUp size={28} className="mb-2 text-[var(--color-text-muted)]" />
                        <p className="text-sm text-secondary">Drop a file here or click to browse</p>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                          PDF, images, documents up to 50 MB
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Write mode description */}
              {createMode === 'write' && (
                <p className="text-xs text-secondary">
                  Creates a blank document. You will be taken to the editor to start writing.
                </p>
              )}
            </div>
            <DialogFooter showCloseButton>
              <Button
                onClick={handleCreate}
                disabled={isCreateDisabled}
              >
                {uploading ? (
                  <>
                    <CircleNotch size={14} className="animate-spin" data-icon="inline-start" />
                    Uploading...
                  </>
                ) : createDoc.isPending ? (
                  <>
                    <CircleNotch size={14} className="animate-spin" data-icon="inline-start" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-subtle"
            />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <File size={32} className="mb-3 text-[var(--color-text-muted)]" />
          <p className="text-sm text-secondary">
            {searchQuery ? 'No documents found' : 'No documents yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="group rounded-lg border border-[var(--color-border-subtle)] bg-surface p-4 transition-all hover:shadow-sm cursor-pointer"
              onClick={() => handleDocClick(doc)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent-muted)]">
                  {doc.content?.type === 'file'
                    ? getFileTypeIcon(doc.content.contentType)
                    : <PencilSimple size={20} className="text-[var(--color-text-muted)]" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-primary">{doc.title}</h3>
                  <p className="truncate text-xs text-secondary">
                    {doc.content?.type === 'file' ? (
                      <>
                        {doc.content.filename}
                        {doc.content.size ? ` · ${formatFileSize(doc.content.size)}` : ''}
                      </>
                    ) : (
                      doc.contentPlaintext
                        ? doc.contentPlaintext.slice(0, 60)
                        : 'Empty document'
                    )}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      />
                    }
                  >
                    <DotsThree size={16} weight="bold" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {doc.content?.type === 'file' && doc.content.url && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          const a = document.createElement('a');
                          a.href = doc.content.url!;
                          a.download = doc.content.filename ?? doc.title;
                          a.target = '_blank';
                          a.click();
                        }}
                      >
                        <DownloadSimple size={14} />
                        Download
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-[var(--color-error)]"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDoc.mutate(doc.id);
                      }}
                    >
                      <Trash size={14} />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex shrink-0">
                  <Avatar size={16} variant="beam" name={doc.author?.name ?? 'Unknown'} colors={['#5B5FC7','#4E52B0','#E8E9F5','#2E7D57','#3178B9']} />
                </span>
                <span className="truncate text-xs text-secondary">{doc.author?.name ?? 'Unknown'}</span>
                <span className="text-xs text-[var(--color-text-muted)]">&middot;</span>
                <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                  {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                </span>
              </div>
              {doc.content?.type === 'file' && isImageType(doc.content.contentType) && doc.content.url && (
                <img
                  src={doc.content.url}
                  alt={doc.title}
                  className="mt-3 max-h-32 w-full rounded-md object-cover"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
