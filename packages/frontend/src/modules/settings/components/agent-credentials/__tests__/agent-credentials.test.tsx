import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import { client } from '@/api-client/client.gen';
import { AgentCredentials } from '../agent-credentials';

const server = setupServer(http.get('http://localhost/api/agent-credentials', () => HttpResponse.json({ credentials: [] })));
beforeAll(() => {
  client.setConfig({ baseUrl: 'http://localhost' });
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

const setup = async () => {
  const i18n = createInstance();
  await i18n.init({ lng: 'en', resources: { en: { translation: {} } } });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const user = userEvent.setup();
  const view = render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <AgentCredentials />
      </QueryClientProvider>
    </I18nextProvider>,
  );

  await user.type(screen.getByLabelText('SETTINGS_AGENT_NAME'), 'My test agent');
  await user.type(screen.getByLabelText('SETTINGS_SECURITY_FORM_CURRENT_PASSWORD'), 'fixture-password');
  return { user, queryClient, ...view };
};

test('shows the token once and retains neither the token nor the password in query caches after dismissal', async () => {
  server.use(
    http.post('http://localhost/api/agent-credentials', async ({ request }) => {
      expect(await request.json()).toEqual({ name: 'My test agent', password: 'fixture-password', expiresInDays: 90 });
      return HttpResponse.json({ credential: { id: 'fixture-credential' }, token: 'fixture-token' }, { status: 201 });
    }),
  );
  const { user, queryClient, unmount } = await setup();

  await user.click(screen.getByRole('button', { name: 'SETTINGS_AGENT_CREATE' }));
  expect(await screen.findByLabelText('SETTINGS_AGENT_TOKEN')).toHaveValue('fixture-token');
  expect(screen.getByLabelText('SETTINGS_SECURITY_FORM_CURRENT_PASSWORD')).toHaveValue('');
  await user.click(screen.getByRole('button', { name: 'SETTINGS_AGENT_DISMISS' }));

  expect(screen.queryByLabelText('SETTINGS_AGENT_TOKEN')).not.toBeInTheDocument();
  const cached = JSON.stringify({
    mutations: queryClient
      .getMutationCache()
      .getAll()
      .map((entry) => entry.state),
    queries: queryClient
      .getQueryCache()
      .getAll()
      .map((entry) => entry.state),
  });
  expect(cached).not.toContain('fixture-password');
  expect(cached).not.toContain('fixture-token');
  unmount();
  queryClient.clear();
});

test('allows a failed issuance to be retried without caching its submitted password', async () => {
  server.use(http.post('http://localhost/api/agent-credentials', () => HttpResponse.json({ message: 'Invalid password' }, { status: 401 })));
  const { user, queryClient, unmount } = await setup();

  await user.click(screen.getByRole('button', { name: 'SETTINGS_AGENT_CREATE' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('SETTINGS_AGENT_CREATE_ERROR');
  expect(screen.getByRole('button', { name: 'SETTINGS_AGENT_CREATE' })).toBeEnabled();
  expect(screen.getByLabelText('SETTINGS_SECURITY_FORM_CURRENT_PASSWORD')).toHaveValue('');
  expect(
    JSON.stringify(
      queryClient
        .getMutationCache()
        .getAll()
        .map((entry) => entry.state),
    ),
  ).not.toContain('fixture-password');
  unmount();
  queryClient.clear();
});

test('aborts an outstanding issuance request when the settings panel unmounts', async () => {
  let aborted = false;
  let received = false;
  server.use(
    http.post('http://localhost/api/agent-credentials', async ({ request }) => {
      received = true;
      await new Promise<void>((resolve) =>
        request.signal.addEventListener(
          'abort',
          () => {
            aborted = true;
            resolve();
          },
          { once: true },
        ),
      );
      return HttpResponse.json({});
    }),
  );
  const { user, queryClient, unmount } = await setup();

  await user.click(screen.getByRole('button', { name: 'SETTINGS_AGENT_CREATE' }));
  await waitFor(() => expect(received).toBe(true));
  unmount();

  await waitFor(() => expect(aborted).toBe(true));
  queryClient.clear();
});
