import './App.css';
import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { client } from './api-client';
import { Providers } from './components/providers/providers';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Could not find root element');
}

import { AuthenticatedRoute } from './components/routes/authenticated-route';
import { RouteError } from './components/routes/route-error';
import { UnauthenticatedRoute } from './components/routes/unauthenticated-route';
import { AppStorePageSuspense } from './modules/app/pages/app-store-page';
import { TranslatableError } from './types/error.types';

const DashboardPage = lazy(() => import('./modules/dashboard/pages/dashboard').then((module) => ({ default: module.DashboardPage })));
const AppStorePage = lazy(() => import('./modules/app/pages/app-store-page').then((module) => ({ default: module.AppStorePage })));
const App = lazy(() => import('./App').then((module) => ({ default: module.App })));
const LoginPage = lazy(() => import('./modules/auth/pages/login-page').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./modules/auth/pages/register-page').then((module) => ({ default: module.RegisterPage })));
const AppDetailsPage = lazy(() => import('./modules/app/pages/app-details-page').then((module) => ({ default: module.AppDetailsPage })));
const SettingsPage = lazy(() => import('./modules/settings/pages/settings-page').then((module) => ({ default: module.SettingsPage })));
const ResetPasswordPage = lazy(() => import('./modules/auth/pages/reset-password-page').then((module) => ({ default: module.ResetPasswordPage })));
const MyAppsPage = lazy(() => import('./modules/app/pages/my-apps-page').then((module) => ({ default: module.MyAppsPage })));

const router = createBrowserRouter([
  {
    element: <UnauthenticatedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        path: '/',
        element: <App />,
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
      {
        path: '/reset-password',
        element: <ResetPasswordPage />,
      },
    ],
  },
  {
    element: <AuthenticatedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/app-store',
        element: (
          <Suspense fallback={<AppStorePageSuspense />}>
            <AppStorePage />
          </Suspense>
        ),
      },
      {
        path: '/app-store/:appId',
        element: (
          <Suspense fallback={<AppStorePageSuspense />}>
            <AppDetailsPage />
          </Suspense>
        ),
      },
      {
        path: '/apps',
        element: (
          <Suspense fallback={<AppStorePageSuspense />}>
            <MyAppsPage />
          </Suspense>
        ),
      },
      {
        path: '/apps/:appId',
        element: (
          <Suspense fallback={<AppStorePageSuspense />}>
            <AppDetailsPage />
          </Suspense>
        ),
      },
      {
        path: '/settings',
        element: (
          <Suspense fallback={<AppStorePageSuspense />}>
            <SettingsPage />
          </Suspense>
        ),
      },
    ],
  },
]);

client.interceptors.response.use(async (res) => {
  if (res.status >= 400) {
    const data = await res.json();
    const error = new TranslatableError(data.message);
    error.intlParams = data.intlParams ?? {};

    throw error;
  }

  return res;
});

client.setConfig({
  credentials: 'include',
});

createRoot(root).render(
  <StrictMode>
    <Providers>
      <main>
        <RouterProvider router={router} />
      </main>
    </Providers>
    <Toaster />
  </StrictMode>,
);
