import { AppContextProvider } from '@/context/app-context';
import { useUserContext } from '@/context/user-context';
import { GuestDashboard } from '@/modules/dashboard/pages/guest-dashboard';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Navigate, Outlet } from 'react-router-dom';
import { ErrorPage } from '../error/error-page';
import { DashboardLayout, DashboardLayoutSuspense } from '../layouts/dashboard/layout';
import { RouteWrapper } from './route-wrapper';

export const AuthenticatedRoute = () => {
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
            <Suspense fallback={<DashboardLayoutSuspense />}>
              <AppContextProvider>
                <Suspense fallback={<DashboardLayout />}>
                  <DashboardLayout>
                    <Outlet />
                  </DashboardLayout>
                </Suspense>
              </AppContextProvider>
            </Suspense>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </RouteWrapper>
  );
};
