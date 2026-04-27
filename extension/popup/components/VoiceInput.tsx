import React, { useState, useRef, useCallback } from 'react';
import { apiRequest } from '@ext/shared/api';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

interface DeepgramToken {
  token: string;
  expiresAt: number;
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'CloseStream' }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);

    const tokenResult = await apiRequest<DeepgramToken>('/deepgram/token', {
      method: 'POST',
    });

    if (!tokenResult.success) {
      setError(tokenResult.error || 'Voice unavailable');
      return;
    }

    const { token } = tokenResult.data;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000 },
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

    const ws = new WebSocket(
      'wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&punctuate=true',
      ['token', token],
    );
    wsRef.current = ws;

    ws.onopen = () => {
      setIsRecording(true);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data);
        }
      };

      mediaRecorder.start(250);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        if (transcript && data.is_final) {
          onTranscript(transcript);
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onerror = () => {
      setError('Voice connection failed');
      stopRecording();
    };

    ws.onclose = () => {
      setIsRecording(false);
    };
  }, [onTranscript, stopRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleRecording}
        disabled={disabled}
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
        {isRecording ? 'Stop' : 'Voice'}
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

      {error && !isRecording && (
        <span className="text-xs truncate max-w-[160px]" style={{ color: 'var(--color-error)' }} title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
