import { expect, test } from '@playwright/test';
import { appTable } from '@runtipi/db';
import { loginUser } from './fixtures/fixtures';
import { clearDatabase, db } from './helpers/db';
import { setSettings } from './helpers/settings';

test.beforeEach(async () => {
  test.fixme(true, 'This test is flaky due to incorrect revalidation of the guest dashboard');
  await clearDatabase();
  await setSettings({});
});

test('user can activate the guest dashboard and see it when logged out', async ({ page, context }) => {
  await loginUser(page, context);
  await page.goto('/settings');

  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByLabel('guestDashboard').setChecked(true);
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByTestId('logout-button').click();

  await expect(page.getByText('No apps to display')).toBeVisible();
});

test('logged out users can see the apps on the guest dashboard', async ({ browser }) => {
  await setSettings({ guestDashboard: true });
  await db.insert(appTable).values({
    config: {},
    isVisibleOnGuestDashboard: true,
    id: 'hello-world',
    exposed: true,
    exposedLocal: true,
    domain: 'duckduckgo.com',
    status: 'running',
    openPort: true,
  });
  await db.insert(appTable).values({
    config: {},
    openPort: true,
    isVisibleOnGuestDashboard: false,
    id: 'actual-budget',
    exposed: false,
    exposedLocal: false,
    status: 'running',
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByText(/Hello World web server/)).toBeVisible();
  const locator = page.locator('text=Actual Budget');
  await expect(locator).not.toBeVisible();

  const [newPage] = await Promise.all([context.waitForEvent('page'), await page.getByRole('link', { name: /Hello World/ }).click()]);

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
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByTestId('logout-button').click();

  await page.goto('/');

  // We should be redirected to the login page
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
});
