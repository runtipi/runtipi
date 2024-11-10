import { UserContextProvider } from '@/context/user-context';
import { MutationCache, QueryClient, QueryClientProvider, QueryErrorResetBoundary } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { type PropsWithChildren, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorPage } from '../error/error-page';
import { I18nProvider } from './i18n/i18n-provider';
import { SocketProvider } from './socket/socket-provider';
import { AutoThemeProvider } from './theme/auto-theme-provider';
import { ThemeProvider } from './theme/theme-provider';

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  }),
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

const PageSuspense = ({ children }: PropsWithChildren) => {
  return (
    <div className="page">
      <div className="page-wrapper">{children}</div>
    </div>
  );
};

export const Providers = ({ children }: PropsWithChildren) => {
  return (
    <QueryClientProvider client={queryClient}>
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary
            fallbackRender={({ error, resetErrorBoundary }) => (
              <PageSuspense>
                <ErrorPage error={error} onReset={resetErrorBoundary} />
              </PageSuspense>
            )}
            onReset={reset}
          >
            <Suspense fallback={<PageSuspense />}>
              <UserContextProvider>
                <ThemeProvider>
                  <AutoThemeProvider>
                    <I18nProvider>
                      <SocketProvider>{children}</SocketProvider>
                    </I18nProvider>
                  </AutoThemeProvider>
                </ThemeProvider>
              </UserContextProvider>
            </Suspense>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};
