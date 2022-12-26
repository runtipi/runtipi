import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCReact, httpLink, loggerLink } from '@trpc/react-query';
import SuperJSON from 'superjson';
import React from 'react';
import fetch from 'isomorphic-fetch';

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

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [
    loggerLink({
      enabled: () => false,
    }),
    httpLink({
      url: 'http://localhost:3000/api/trpc',
      headers() {
        return {};
      },
      fetch: async (input, init?) =>
        fetch(input, {
          ...init,
        }),
    }),
  ],
  transformer: SuperJSON,
});

export function TRPCTestClientProvider(props: { children: React.ReactNode }) {
  const { children } = props;

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
