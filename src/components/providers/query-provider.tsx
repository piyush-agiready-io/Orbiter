'use client';

import {
  QueryClient,
  QueryClientProvider,
  MutationCache,
  type Mutation,
} from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

interface MutationMeta {
  silent?: boolean;
  errorMessage?: string;
}

function defaultErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return 'Something went wrong. Please try again.';
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Treat data as fresh for 30s — cuts redundant refetches on
            // navigations and re-mounts. Mutations still invalidate
            // explicitly when something changes.
            staleTime: 30 * 1000,
            // Cache stays for 5 min after last observer unmounts so route
            // changes feel instant.
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
        },
        mutationCache: new MutationCache({
          onError: (error, _vars, _ctx, mutation: Mutation<unknown, unknown, unknown, unknown>) => {
            const meta = mutation.options.meta as MutationMeta | undefined;
            if (meta?.silent) return;
            // Skip the global toast if the call site supplied its own onError
            // (it's already going to surface the error). The .mutate({ onError })
            // path doesn't show up here, so we only check the useMutation-level handler.
            if (mutation.options.onError) return;
            const message = meta?.errorMessage ?? defaultErrorMessage(error);
            toast.error(message);
          },
        }),
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
