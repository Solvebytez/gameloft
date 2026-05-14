'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
            // Do not retry rate limits or auth failures (avoids refresh / throttle storms)
            retry: (failureCount, error) => {
              const msg = error instanceof Error ? error.message : String(error);
              if (msg.includes('Too many requests') || msg.includes('Too Many Attempts')) {
                return false;
              }
              if (error && typeof error === 'object' && 'response' in error) {
                const status = (error as { response?: { status?: number } }).response?.status;
                if (status === 401 || status === 403 || status === 429) {
                  return false;
                }
              }
              return failureCount < 1;
            },
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

