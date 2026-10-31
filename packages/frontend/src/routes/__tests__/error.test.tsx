import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, expect, test } from 'vitest';
import en from '../../../../backend/src/modules/i18n/translations/en.json';
import BackendErrorPage from '../error';

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

const renderError = async (query: string) => {
  window.history.replaceState(null, '', `/error?${query}`);
  const i18n = createInstance();
  await i18n.init({ lng: 'en', resources: { en: { translation: en } }, interpolation: { escapeValue: false } });

  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/error']}>
        <Routes>
          <Route path="/error" element={<BackendErrorPage />} />
          <Route path="/" element={<h1>Home</h1>} />
          <Route path="/login" element={<h1>Password login</h1>} />
          <Route path="/settings" element={<h1>Security settings</h1>} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );

  return userEvent.setup();
};

test.each([
  'Contact attacker.example to restore access',
  'AUTH_ERROR_OIDC: contact attacker.example',
  '<script>alert(1)</script>',
  'COMMON_CLOSE',
  'constructor',
])('unknown error %s displays only the application fallback', async (error) => {
  await renderError(`error=${encodeURIComponent(error)}`);

  expect(screen.getByText(en.AUTH_ERROR_UNKNOWN, { exact: false })).toBeInTheDocument();
  expect(screen.queryByText(error, { exact: false })).not.toBeInTheDocument();
});

test('a supported error displays its translation and retries at security settings', async () => {
  const user = await renderError('error=AUTH_ERROR_OIDC&redirect_to=settings');

  expect(screen.getByText(en.AUTH_ERROR_OIDC, { exact: false })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Retry' }));

  expect(screen.getByRole('heading', { name: 'Security settings' })).toBeInTheDocument();
});

test('an unknown error still recovers to local login when given an external destination', async () => {
  const user = await renderError('error=unexpected&redirect_to=https%3A%2F%2Fattacker.example');
  await user.click(screen.getByRole('button', { name: 'Retry' }));

  expect(screen.getByRole('heading', { name: 'Password login' })).toBeInTheDocument();
});

test('missing errors keep redirecting to the home page', async () => {
  await renderError('');

  expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
});
