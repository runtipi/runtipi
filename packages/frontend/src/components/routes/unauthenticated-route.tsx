import { Suspense } from 'react';
import { AuthLayout } from '../layouts/auth/layout';
import { Outlet } from 'react-router-dom';
import { RouteWrapper } from './route-wrapper';

export const UnauthenticatedRoute = () => {
  return (
    <RouteWrapper>
      <Suspense fallback={<AuthLayout />}>
        <AuthLayout>
          <Outlet />
        </AuthLayout>
      </Suspense>
    </RouteWrapper>
  );
};
