import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { AuthLayout } from '../layouts/auth/layout';
import { ErrorBoundary } from '../error-boundary';
import { RouteWrapper } from './route-wrapper';

export default () => {
  return (
    <RouteWrapper>
      <ErrorBoundary>
        <Suspense fallback={<AuthLayout />}>
          <AuthLayout>
            <Outlet />
          </AuthLayout>
        </Suspense>
      </ErrorBoundary>
    </RouteWrapper>
  );
};
