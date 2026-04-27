import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

type Status = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

function MicPermission() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  async function requestAccess() {
    setStatus('requesting');
    setErrorMessage('');
    try {
      // Triggers the browser's native microphone permission prompt for
      // the chrome-extension://<id> origin. Once granted, the permission
      // sticks for this origin and the popup's getUserMedia will work.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop tracks immediately — we only needed the prompt to fire.
      stream.getTracks().forEach((t) => t.stop());
      setStatus('granted');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setStatus('denied');
      } else {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
      }
    }
  }

  // Auto-request once on mount; the user landed here specifically for this.
  useEffect(() => {
    void requestAccess();
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-page, #fafafa)',
        color: 'var(--color-text-primary, #111)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          background: 'var(--color-bg-surface, #fff)',
          border: '1px solid var(--color-border-subtle, #e5e7eb)',
          borderRadius: 12,
          padding: 28,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>
          Microphone access for Orbiter
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary, #555)', margin: '0 0 20px', lineHeight: 1.5 }}>
          Orbiter uses your microphone to transcribe voice descriptions for
          bug reports. Audio is sent only when you press Record.
        </p>

        {status === 'requesting' && (
          <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--color-bg-subtle, #f3f4f6)', fontSize: 13 }}>
            Requesting microphone permission… look for the prompt at the top
            of this tab.
          </div>
        )}

        {status === 'granted' && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: 'var(--color-success-muted, #dcfce7)',
              color: 'var(--color-success, #166534)',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            Microphone access granted. You can close this tab and head back
            to the Orbiter popup — the Voice button will work now.
          </div>
        )}

        {status === 'denied' && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: 'var(--color-error-muted, #fee2e2)',
              color: 'var(--color-error, #991b1b)',
              fontSize: 13,
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Permission was denied. Click the lock icon in the address bar,
            change <strong>Microphone</strong> to <strong>Allow</strong>,
            then reload this tab and try again.
          </div>
        )}

        {status === 'error' && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: 'var(--color-error-muted, #fee2e2)',
              color: 'var(--color-error, #991b1b)',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {errorMessage || 'Could not request microphone permission.'}
          </div>
        )}

        {(status === 'idle' || status === 'denied' || status === 'error') && (
          <button
            type="button"
            onClick={requestAccess}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              background: 'var(--color-accent, #2563eb)',
              color: '#fff',
              border: 'none',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {status === 'denied' ? 'Try again' : 'Request microphone access'}
          </button>
        )}

        {status === 'granted' && (
          <button
            type="button"
            onClick={() => window.close()}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              background: 'var(--color-accent, #2563eb)',
              color: '#fff',
              border: 'none',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Close this tab
          </button>
        )}
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<MicPermission />);
}
