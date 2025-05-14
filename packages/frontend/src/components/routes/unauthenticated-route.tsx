import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { AuthLayout } from '../layouts/auth/layout';
import { RouteWrapper } from './route-wrapper';

export default () => {
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
