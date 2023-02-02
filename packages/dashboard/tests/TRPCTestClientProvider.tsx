import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCReact, httpLink, loggerLink } from '@trpc/react-query';
import React, { useState } from 'react';
import fetch from 'isomorphic-fetch';
import superjson from 'superjson';

import type { AppRouter } from '../src/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>({
  unstable_overrides: {
    useMutation: {
      async onSuccess(opts) {
        await opts.originalFn();
        await opts.queryClient.invalidateQueries();
      },
    },
  },
});

export function TRPCTestClientProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        loggerLink({
          enabled: () => false,
        }),
        httpLink({
          url: 'http://localhost:3000/api/trpc',
          fetch: async (input, init?) =>
            fetch(input, {
              ...init,
            }),
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
