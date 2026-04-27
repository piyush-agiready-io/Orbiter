import React, { useState, useRef, useCallback } from 'react';
import { API_BASE_URL } from '@ext/shared/constants';
import { getStoredTokens, isTokenExpired } from '@ext/shared/storage';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

async function getAccessToken(): Promise<string | null> {
  try {
    const expired = await isTokenExpired();
    if (expired) {
      const response = await chrome.runtime.sendMessage({ type: 'REFRESH_TOKEN' });
      if (!response?.success) return null;
    }
    const tokens = await getStoredTokens();
    return tokens?.accessToken || null;
  } catch {
    return null;
  }
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const transcribe = useCallback(
    async (blob: Blob) => {
      setIsTranscribing(true);
      setError(null);

      try {
        const token = await getAccessToken();
        if (!token) {
          setError('Not authenticated');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/deepgram/transcribe`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': blob.type || 'audio/webm',
          },
          body: blob,
        });

        const json = await response.json();
        if (!response.ok || !json.success) {
          setError(json.error?.message || `Transcription failed (${response.status})`);
          return;
        }

        const transcript = (json.data?.transcript ?? '').trim();
        if (transcript) {
          onTranscript(transcript);
        } else {
          setError('No speech detected');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Transcription failed');
      } finally {
        setIsTranscribing(false);
      }
    },
    [onTranscript],
  );

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1 },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied');
      } else {
        setError('Could not access microphone');
      }
      return;
    }
    streamRef.current = stream;

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      cleanup();
      if (blob.size > 0) {
        void transcribe(blob);
      }
    };

    recorder.onerror = () => {
      setError('Recording failed');
      cleanup();
      setIsRecording(false);
    };

    recorder.start();
    setIsRecording(true);
  }, [cleanup, transcribe]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleRecording}
        disabled={disabled || isTranscribing}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50"
        style={{
          background: isRecording ? 'var(--color-error-muted)' : 'var(--color-bg-subtle)',
          color: isRecording ? 'var(--color-error)' : 'var(--color-text-secondary)',
          border: `1px solid ${isRecording ? 'var(--color-error)' : 'var(--color-border-default)'}`,
          borderRadius: 'var(--radius-md)',
        }}
        title={isRecording ? 'Stop recording' : 'Record voice description'}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
        {isRecording ? 'Stop' : isTranscribing ? 'Transcribing…' : 'Voice'}
      </button>

      {isRecording && (
        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-error)' }}>
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: 'var(--color-error)' }}
          />
          Recording…
        </span>
      )}

      {error && !isRecording && !isTranscribing && (
        <span
          className="text-xs truncate max-w-[180px]"
          style={{ color: 'var(--color-error)' }}
          title={error}
        >
          {error}
        </span>
      )}
    </div>
  );
}
