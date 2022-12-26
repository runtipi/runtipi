import { httpBatchLink, loggerLink } from '@trpc/client';
import { createTRPCNext } from '@trpc/next';
import superjson from 'superjson';
import type { AppRouter } from '../../server/routers/_app';

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // browser should use relative path
    return '';
  }

  return `http://localhost:${process.env.PORT ?? 3000}`;
}

let token: string | null = '';

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      /**
       * @link https://trpc.io/docs/data-transformers
       */
      transformer: superjson,
      links: [
        loggerLink({
          enabled: (opts) => process.env.NODE_ENV === 'development' || (opts.direction === 'down' && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          headers() {
            if (typeof window !== 'undefined') {
              token = localStorage.getItem('token');
            }

            return {
              authorization: token ? `Bearer ${token}` : '',
            };
          },
        }),
      ],
    };
  },
  /**
   * @link https://trpc.io/docs/ssr
   * */
  ssr: false,
});
