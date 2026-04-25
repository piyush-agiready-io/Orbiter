'use client';

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useOpenAIConnectionStatus,
  useInitiateConnection,
  usePollConnection,
  useDisconnectOpenAI,
} from '@/hooks/queries/use-openai-connection';
import { Button } from '@/components/ui/button';
import { ChatGPTStatusBadge } from './chatgpt-status-badge';
import { DeviceCodeDisplay } from './device-code-display';

export function ChatGPTConnection() {
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useOpenAIConnectionStatus();
  const initiate = useInitiateConnection();
  const poll = usePollConnection();
  const disconnect = useDisconnectOpenAI();

  const [deviceCode, setDeviceCode] = useState<{
    userCode: string;
    verificationUrl: string;
    expiresIn: number;
  } | null>(null);
  const [polling, setPolling] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleCancel = () => {
    setPolling(false);
    setDeviceCode(null);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  };

  const handleConnect = async () => {
    const result = await initiate.mutateAsync({ mode: 'device-code' });
    const data = result as unknown as {
      userCode: string;
      verificationUrl: string;
      expiresIn: number;
    };
    setDeviceCode(data);
    setPolling(true);

    window.open(data.verificationUrl, '_blank');

    // Start polling every 5 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const pollResult = await poll.mutateAsync();
        const pollData = pollResult as unknown as { authorized: boolean };
        if (pollData?.authorized) {
          setPolling(false);
          setDeviceCode(null);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          queryClient.invalidateQueries({ queryKey: ['openai-connection-status'] });
        }
      } catch {
        // Polling error — stop and let user retry
        setPolling(false);
        setDeviceCode(null);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      }
    }, 5000);
  };

  const handleDisconnect = async () => {
    await disconnect.mutateAsync();
  };

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg border border-[var(--color-border-subtle)] bg-surface p-6">
        <div className="h-6 w-48 rounded bg-muted" />
        <div className="mt-4 h-10 w-32 rounded bg-muted" />
      </div>
    );
  }

  const connected = (status as unknown as { connected?: boolean })?.connected;
  const statusData = status as unknown as {
    connected?: boolean;
    email?: string;
    planType?: string;
  };

  return (
    <div className="rounded-lg border border-default bg-surface p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-primary">
            ChatGPT Connection
          </h3>
          <p className="mt-1 text-sm text-secondary">
            Connect your ChatGPT account to enable AI-powered project management features.
          </p>
        </div>
        <ChatGPTStatusBadge
          connected={!!connected}
          email={statusData?.email}
          planType={statusData?.planType}
        />
      </div>

      <div className="mt-6">
        {connected ? (
          <div className="flex items-center gap-4">
            <div className="flex-1 text-sm text-secondary">
              {statusData?.email && (
                <p>Account: <span className="font-medium text-primary">{statusData.email}</span></p>
              )}
              {statusData?.planType && (
                <p className="mt-1">Plan: <span className="font-medium text-primary">{statusData.planType}</span></p>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnect.isPending}
              className="text-[var(--color-error)] hover:text-[var(--color-error)]"
            >
              {disconnect.isPending ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </div>
        ) : deviceCode ? (
          <div className="space-y-4">
            <DeviceCodeDisplay
              userCode={deviceCode.userCode}
              verificationUrl={deviceCode.verificationUrl}
              expiresIn={deviceCode.expiresIn}
            />
            {polling && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  <span className="text-sm text-secondary">
                    Waiting for authorization...
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={initiate.isPending}
          >
            {initiate.isPending ? 'Starting...' : 'Connect ChatGPT'}
          </Button>
        )}
      </div>
    </div>
  );
}
