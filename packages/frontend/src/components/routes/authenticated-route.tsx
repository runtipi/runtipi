import { AppContextProvider } from '@/context/app-context';
import { useUserContext } from '@/context/user-context';
import { GuestDashboard } from '@/modules/dashboard/pages/guest-dashboard';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Navigate, Outlet } from 'react-router';
import { ErrorPage } from '../error/error-page';
import { DashboardLayout, DashboardLayoutSuspense } from '../layouts/dashboard/layout';
import { SSEProvider } from '../providers/sse/sse-provider';
import { RouteWrapper } from './route-wrapper';

export default () => {
  const { isLoggedIn, isGuestDashboardEnabled } = useUserContext();

  if (!isLoggedIn && !isGuestDashboardEnabled) {
    return <Navigate to="/login" replace />;
  }

  if (isGuestDashboardEnabled && !isLoggedIn) {
    return <GuestDashboard />;
  }

  return (
    <RouteWrapper>
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary
            fallbackRender={({ error, resetErrorBoundary }) => (
              <DashboardLayoutSuspense>
                <ErrorPage error={error} onReset={resetErrorBoundary} />
              </DashboardLayoutSuspense>
            )}
            onReset={reset}
          >
            <Suspense fallback={null}>
              <AppContextProvider>
                <SSEProvider>
                  <Suspense fallback={<DashboardLayout />}>
                    <DashboardLayout>
                      <Outlet />
                    </DashboardLayout>
                  </Suspense>
                </SSEProvider>
              </AppContextProvider>
            </Suspense>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </RouteWrapper>
  );
};
