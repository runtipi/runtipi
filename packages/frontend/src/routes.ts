import { type RouteConfig, index, layout, prefix, route } from '@react-router/dev/routes';

export default [
  // Unauthenticated routes
  layout('./components/routes/unauthenticated-route.tsx', [
    route('login', './modules/auth/pages/login-page.tsx', { id: 'login' }),
    route('register', './modules/auth/pages/register-page.tsx', { id: 'register' }),
    route('reset-password', './modules/auth/pages/reset-password-page.tsx', { id: 'reset-password' }),
  ]),
  // Authenticated routes
  layout('./components/routes/authenticated-route.tsx', [
    route('dashboard', './modules/dashboard/pages/dashboard.tsx', { id: 'dashboard' }),

    // App store routes
    ...prefix('app-store', [
      index('./modules/app/pages/app-store-page.tsx', { id: 'app-store' }),
      route(':storeId', './modules/app/pages/app-store-page.tsx', { id: 'app-store-id' }),
      route(':storeId/:appId', './modules/app/pages/app-details-page.tsx', { id: 'app-details-store' }),
    ]),

    // My apps routes
    ...prefix('apps', [
      index('./modules/app/pages/my-apps-page.tsx', { id: 'my-apps' }),
      route(':storeId', './modules/app/pages/my-apps-page.tsx', { id: 'my-apps-store' }),
      route(':storeId/:appId', './modules/app/pages/app-details-page.tsx', { id: 'app-details' }),
    ]),

    // Settings route
    ...prefix('settings', [index('./modules/settings/pages/settings-page.tsx', { id: 'settings' })]),
  ]),
] satisfies RouteConfig;
