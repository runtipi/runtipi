import { test, expect } from '@playwright/test';
import { loginUser } from './fixtures/fixtures';
import { clearDatabase } from './helpers/db';

test.beforeEach(async ({ page, isMobile }) => {
  await clearDatabase();
  await loginUser(page);

  if (isMobile) {
    // TODO: Fix mobile accessibility for the dropdown menu
    // await page.getByRole('button', { name: 'Menu' }).click();
    await page.goto('/app-store');
  } else {
    await page.getByRole('link', { name: 'App store' }).click();
  }

  await page.getByPlaceholder('Search').fill('hello');
  await page.getByRole('link', { name: 'Hello World' }).click();
});

test('user can install and uninstall app', async ({ page, context }) => {
  // Install app
  await page.getByRole('button', { name: 'Install' }).click();

  await expect(page.getByText('Install Hello World')).toBeVisible();

  await page.getByRole('button', { name: 'Install' }).click();

  await expect(page.getByText('Installing')).toBeVisible();
  await expect(page.getByText('Running')).toBeVisible({ timeout: 60000 });
  await expect(page.getByText('App installed successfully')).toBeVisible();

  const [newPage] = await Promise.all([context.waitForEvent('page'), await page.getByTestId('app-details').getByRole('button', { name: 'Open' }).click()]);

  await newPage.waitForLoadState();
  await expect(newPage.getByText('Hello World')).toBeVisible();
  await newPage.close();

  // Stop app
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByText('Stop Hello World')).toBeVisible();

  await page.getByRole('button', { name: 'Stop' }).click();

  await expect(page.getByText('Stopping')).toBeVisible();
  await expect(page.getByText('App stopped successfully')).toBeVisible({ timeout: 60000 });

  // Uninstall app
  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('Uninstall Hello World?')).toBeVisible();

  await page.getByRole('button', { name: 'Uninstall' }).click();

  await expect(page.getByText('Uninstalling')).toBeVisible();
  await expect(page.getByText('App uninstalled successfully')).toBeVisible({ timeout: 60000 });
});
