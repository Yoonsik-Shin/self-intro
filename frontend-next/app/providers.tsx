'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthSessionCoordinator } from '@/components/auth/AuthSessionCoordinator';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: 1,
                        staleTime: 30_000,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <AuthSessionCoordinator queryClient={queryClient} />
            {children}
            {process.env.NODE_ENV === 'development' && (
                <div className="print:hidden">
                    <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
                </div>
            )}
        </QueryClientProvider>
    );
}
