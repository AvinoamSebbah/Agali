'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocationProvider } from '@/contexts/LocationContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LocationProvider>
            {children}
          </LocationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
