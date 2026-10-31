import '@testing-library/jest-dom/vitest';
import {
  appContextQueryKey,
  searchAppsInfiniteOptions,
  systemLoadOptions,
  getLoginProvidersOptions,
  getUserProvidersQueryKey,
  getTrustedSubsQueryKey,
  userContextQueryKey,
} from '@/api-client/@tanstack/react-query.gen';
import { client } from '@/api-client/client.gen';
import { AppContextProvider } from '@/context/app-context';
import { UserContextProvider } from '@/context/user-context';
import { OAuthActions } from '@/modules/settings/components/oauth-actions/oauth-actions';
import { OAuthForm } from '@/modules/settings/components/oauth-form/oauth-form';
import BackendErrorPage from '@/routes/error';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createInstance } from 'i18next';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { Suspense, type ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest';
import en from '../../../../../../backend/src/modules/i18n/translations/en.json';
import LoginPage from '../login-page';

const server = setupServer(http.get('http://localhost:3000/api/oidc/providers/login', () => HttpResponse.json({ providers: [] })));
const clients: QueryClient[] = [];
beforeAll(() => {
  client.setConfig({ baseUrl: 'http://localhost:3000' });
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  cleanup();
  for (const queryClient of clients.splice(0)) {
    queryClient.clear();
  }
  server.resetHandlers();
  window.history.replaceState(null, '', '/login');
});
afterAll(() => server.close());

const setup = async (children: ReactNode = <LoginPage />, path = '/login') => {
  const i18n = createInstance();
  await i18n.init({ lng: 'en', resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } } });
  clients.push(queryClient);
  queryClient.setQueryData(userContextQueryKey(), { isConfigured: true, isLoggedIn: false });

  const view = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary fallback={<h1>Unavailable</h1>}>
          <Suspense fallback={<h1>Loading</h1>}>
            <UserContextProvider>
              <I18nextProvider i18n={i18n}>
                <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
              </I18nextProvider>
            </UserContextProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

  return { queryClient, view, user: userEvent.setup() };
};

test('password login remains usable after provider discovery fails', async () => {
  server.use(http.get('http://localhost:3000/api/oidc/providers/login', () => HttpResponse.json({ message: 'Unavailable' }, { status: 503 })));
  const { queryClient, view, user } = await setup();
  await queryClient.prefetchQuery({ ...getLoginProvidersOptions(), retry: false });
  view();

  await user.type(screen.getByLabelText(en.AUTH_FORM_EMAIL), 'operator@example.com');
  await user.type(screen.getByLabelText(en.AUTH_FORM_PASSWORD), 'password');

  expect(screen.getByRole('button', { name: en.AUTH_LOGIN_SUBMIT })).toBeEnabled();
  expect(screen.queryByRole('heading', { name: 'Unavailable' })).not.toBeInTheDocument();
});

test('OIDC resumes the local TOTP form and removes the challenge from browser history', async () => {
  window.history.replaceState(null, '', '/login#totp_session_id=challenge-id');
  const { view } = await setup();
  view();

  expect(await screen.findByRole('heading', { name: en.AUTH_TOTP_TITLE })).toBeInTheDocument();
  expect(window.location.hash).toBe('');
  expect(screen.queryByLabelText(en.AUTH_FORM_PASSWORD)).not.toBeInTheDocument();
});

test.each(['login', 'https://attacker.example'])('error recovery returns to local login for destination %s', async (destination) => {
  window.history.replaceState(null, '', `/error?error=AUTH_ERROR_OIDC&redirect_to=${encodeURIComponent(destination)}`);
  const { view, user } = await setup(
    <Routes>
      <Route path="/error" element={<BackendErrorPage />} />
      <Route path="/login" element={<h1>Password login</h1>} />
    </Routes>,
    '/error',
  );
  view();
  await user.click(screen.getByRole('button', { name: 'Retry' }));

  expect(screen.getByRole('heading', { name: 'Password login' })).toBeInTheDocument();
});

test('editing keeps the provider slug fixed and the existing client secret out of the form', async () => {
  const provider = {
    slug: 'example',
    displayName: 'Example',
    clientId: 'runtipi',
    issuer: 'https://idp.example',
    discovery: 'https://idp.example/.well-known/openid-configuration',
  };
  const { view } = await setup(<OAuthForm onSubmit={vi.fn()} initialValues={provider} />);
  view();

  expect(screen.getByLabelText(en.SETTINGS_SECURITY_OAUTH_FORM_SLUG)).toHaveAttribute('readonly');
  expect(screen.getByLabelText(en.SETTINGS_SECURITY_OAUTH_FORM_CLIENT_SECRET)).toHaveValue('');
  expect(screen.getByLabelText(en.SETTINGS_SECURITY_OAUTH_FORM_CLIENT_SECRET)).not.toBeRequired();
});

test('providers with overlapping slug prefixes display only their own linked identities', async () => {
  const { queryClient, view, user } = await setup(
    <AppContextProvider>
      <OAuthActions />
    </AppContextProvider>,
  );
  queryClient.setQueryData(appContextQueryKey(), { userSettings: { timeZone: 'UTC' } });
  queryClient.setQueryData(searchAppsInfiniteOptions().queryKey, { pages: [], pageParams: [] });
  queryClient.setQueryData(systemLoadOptions().queryKey, {
    cpuLoad: 0,
    diskSize: 0,
    diskUsed: 0,
    memoryTotal: 0,
    memorySource: 'host',
    percentUsed: 0,
    percentUsedMemory: 0,
  });
  const provider = { clientId: 'runtipi', issuer: 'https://idp.example', discovery: 'https://idp.example/.well-known/openid-configuration' };
  queryClient.setQueryData(getUserProvidersQueryKey(), {
    providers: [
      { ...provider, slug: 'auth', displayName: 'Auth' },
      { ...provider, slug: 'authentik', displayName: 'Authentik' },
    ],
  });
  queryClient.setQueryData(getTrustedSubsQueryKey(), {
    subs: [{ slug: 'opaque-id', providerSlug: 'authentik', providerDisplayName: 'Authentik', sub: 'external-account', createdAt: 0 }],
  });
  view();
  const buttons = screen.getAllByRole('button', { name: en.SETTINGS_SECURITY_OAUTH_DETAILS_SHOW });
  const first = buttons[0];
  const second = buttons[1];
  if (!first || !second) throw new Error('Expected two provider controls');
  await user.click(first);
  expect(screen.queryByText('external-account')).not.toBeInTheDocument();
  await user.click(second);

  expect(screen.getByText('external-account')).toBeInTheDocument();
});
