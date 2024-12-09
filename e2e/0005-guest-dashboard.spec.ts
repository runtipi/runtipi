import { expect, test } from '@playwright/test';
import { installApp, loginUser } from './fixtures/fixtures';
import { clearDatabase, db } from './helpers/db';
import { setSettings } from './helpers/settings';

test.beforeEach(async () => {
  await clearDatabase();
  await setSettings({});
});

test('user can activate the guest dashboard and see it when logged out', async ({ page, context }) => {
  await loginUser(page, context);
  await page.goto('/settings');

  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByLabel('guestDashboard').setChecked(true);
  await page.getByRole('button', { name: 'Update settings' }).click();
  await page.getByTestId('logout-button').click();

  await expect(page.getByText('No apps to display')).toBeVisible();
});

test('logged out users can see the apps on the guest dashboard', async ({ page, context }) => {
  await loginUser(page, context);

  const store = await db.query.appStore.findFirst();

  if (!store) {
    throw new Error('No store found');
  }

  await installApp(page, store?.id, 'nginx', { visibleOnGuestDashboard: true, domain: 'duckduckgo.com' });
  await installApp(page, store?.id, '2fauth', { visibleOnGuestDashboard: false });

  await page.goto('/settings');
  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByLabel('guestDashboard').setChecked(true);
  await page.getByRole('button', { name: 'Update settings' }).click();
  await page.getByTestId('logout-button').click();

  await expect(page.getByText(/Open-source simple and fast web server/)).toBeVisible();
  const locator = page.locator('text=2Fauth');
  await expect(locator).not.toBeVisible();

  await page.getByRole('link', { name: /Nginx/ }).click();

  const [newPage] = await Promise.all([context.waitForEvent('page'), page.getByRole('menuitem', { name: 'duckduckgo.com' }).click()]);

  await newPage.waitForLoadState();
  expect(newPage.url()).toBe('https://duckduckgo.com/');
  await newPage.close();

  await context.close();
});

test('user can deactivate the guest dashboard and not see it when logged out', async ({ page, context }) => {
  await loginUser(page, context);
  await page.goto('/settings');

  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByLabel('guestDashboard').setChecked(false);
  await page.getByRole('button', { name: 'Update settings' }).click();
  await page.getByTestId('logout-button').click();

  // We should be redirected to the login page
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
});
