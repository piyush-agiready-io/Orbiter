import React, { useState, useCallback } from 'react';
import { ProjectSelector } from './ProjectSelector';
import { VoiceInput } from './VoiceInput';
import { useCapture } from '../hooks/useCapture';
import { uploadScreenshot, apiRequest } from '@ext/shared/api';
import type { ExtUser } from '@ext/shared/types';

interface BugCaptureProps {
  user: ExtUser;
  onLogout: () => void;
}

type SubmitState = 'idle' | 'uploading' | 'submitting' | 'success' | 'error';

export function BugCapture({ user, onLogout }: BugCaptureProps) {
  const { capturedData, screenshotDataUrl, isCapturing, captureError, capture } = useCapture();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleVoiceTranscript = useCallback((text: string) => {
    setDescription((prev) => {
      if (prev.length === 0) return text;
      return `${prev} ${text}`;
    });
  }, []);

  async function handleSubmit() {
    if (!title.trim() || !selectedProjectId) return;

    setSubmitError(null);

    try {
      let screenshotUrl: string | undefined;
      if (screenshotDataUrl) {
        setSubmitState('uploading');
        try {
          // Convert data URL to Blob for direct upload via fetch (not service worker)
          const res = await fetch(screenshotDataUrl);
          const blob = await res.blob();
          const filename = `bug-screenshot-${Date.now()}.png`;
          const uploadResult = await uploadScreenshot(blob, filename);
          if (uploadResult.success) {
            screenshotUrl = uploadResult.data;
          }
        } catch {
          // Screenshot upload failed — continue without it
        }
      }

      setSubmitState('submitting');

      const consoleLogs = capturedData?.consoleLogs
        ?.map((log) => `[${log.level.toUpperCase()}] ${log.message}`)
        .join('\n') || '';

      const bugData = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority: 'P2',
        status: 'open',
        source: 'extension',
        metadata: {
          url: capturedData?.url || 'Unknown',
          consoleLogs: consoleLogs || undefined,
          screenshot: screenshotUrl,
          device: capturedData?.device || 'Unknown',
          browser: capturedData?.browser || 'Unknown',
          os: capturedData?.os || 'Unknown',
          viewport: capturedData?.viewport || { width: 0, height: 0 },
        },
      };

      const result = await apiRequest(`/projects/${selectedProjectId}/bugs`, {
        method: 'POST',
        body: bugData,
      });

      if (result.success) {
        setSubmitState('success');
        setTimeout(() => {
          setTitle('');
          setDescription('');
          setSubmitState('idle');
          capture();
        }, 2000);
      } else {
        setSubmitState('error');
        setSubmitError(result.error);
      }
    } catch (err) {
      setSubmitState('error');
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    }
  }

  if (submitState === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] p-6">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'var(--color-success-muted)' }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--color-success)' }}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Bug reported
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Redirecting...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[480px]">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        <h1 className="text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
          Orbiter
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {user.name}
          </span>
          <button
            onClick={onLogout}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{
              color: 'var(--color-text-muted)',
              background: 'transparent',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Captured context banner */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ background: 'var(--color-bg-subtle)' }}
      >
        {isCapturing ? (
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Capturing page data...
          </span>
        ) : captureError ? (
          <span className="text-xs" style={{ color: 'var(--color-error)' }}>
            {captureError}
          </span>
        ) : (
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <span title={capturedData?.url}>
              {capturedData?.url
                ? capturedData.url.length > 35
                  ? `${capturedData.url.slice(0, 35)}...`
                  : capturedData.url
                : 'No URL'}
            </span>
            {screenshotDataUrl && (
              <span style={{ color: 'var(--color-success)' }}>Screenshot captured</span>
            )}
            {capturedData?.consoleLogs && capturedData.consoleLogs.length > 0 && (
              <span>
                {capturedData.consoleLogs.filter((l) => l.level === 'error').length} errors
              </span>
            )}
          </div>
        )}
        <button
          onClick={capture}
          disabled={isCapturing}
          className="text-xs px-2 py-1 rounded transition-colors disabled:opacity-50"
          style={{
            color: 'var(--color-accent-text)',
            background: 'var(--color-accent-muted)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          Re-capture
        </button>
      </div>

      {/* Screenshot preview (always visible) */}
      {screenshotDataUrl && (
        <div className="px-4 pt-2">
          <img
            src={screenshotDataUrl}
            alt="Screenshot"
            className="w-full"
            style={{
              border: '1px solid var(--color-border-subtle)',
              maxHeight: 160,
              width: '100%',
              objectFit: 'cover',
              objectPosition: 'top',
              borderRadius: 6,
            }}
          />
        </div>
      )}

      {/* Form */}
      <div className="flex-1 p-4 space-y-3">
        <ProjectSelector
          selectedProjectId={selectedProjectId}
          onSelect={setSelectedProjectId}
        />

        <div>
          <label
            htmlFor="bug-title"
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Title
          </label>
          <input
            id="bug-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What went wrong?"
            autoFocus
            className="w-full px-3 py-2 text-sm rounded-md outline-none transition-colors"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
              borderRadius: 'var(--radius-md)',
            }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="bug-description"
              className="text-xs font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Description
            </label>
            <VoiceInput
              onTranscript={handleVoiceTranscript}
              disabled={submitState !== 'idle'}
            />
          </div>
          <textarea
            id="bug-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue or use voice input..."
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-md outline-none resize-none transition-colors"
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
              borderRadius: 'var(--radius-md)',
            }}
          />
        </div>

        {submitState === 'error' && submitError && (
          <p className="text-xs" style={{ color: 'var(--color-error)' }}>
            {submitError}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!title.trim() || !selectedProjectId || submitState === 'uploading' || submitState === 'submitting'}
          className="w-full py-2.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-text-inverse)',
            borderRadius: 'var(--radius-md)',
            cursor: (!title.trim() || !selectedProjectId || submitState === 'uploading' || submitState === 'submitting')
              ? 'not-allowed'
              : 'pointer',
          }}
        >
          {submitState === 'uploading'
            ? 'Uploading screenshot...'
            : submitState === 'submitting'
              ? 'Submitting bug...'
              : 'Submit Bug Report'}
        </button>
      </div>

      {/* Metadata captured silently — not shown in UI */}
    </div>
  );
}
