import { expect, test } from '@playwright/test';
import { loginUser } from './fixtures/fixtures';
import { clearDatabase } from './helpers/db';

test.beforeEach(async ({ page, context, isMobile }) => {
  await clearDatabase();
  await loginUser(page, context);

  if (isMobile) {
    // TODO: Fix mobile accessibility for the dropdown menu
    // await page.getByRole('button', { name: 'Menu' }).click();
    await page.goto('/app-store');
  } else {
    await page.getByRole('link', { name: 'App store' }).click();
  }

  await page.getByPlaceholder('Search').fill('nginx');
  await page.getByRole('link', { name: 'Nginx' }).click();
});

test('user can install and uninstall app', async ({ page, context }) => {
  test.slow();
  // Install app
  await page.getByRole('button', { name: 'Install' }).click();

  await expect(page.getByText('Install Nginx')).toBeVisible();

  await page.getByRole('button', { name: 'Install' }).click();

  await expect(page.getByText('Installing')).toBeVisible();
  await expect(page.getByText('Running')).toBeVisible({ timeout: 60000 });

  await page.getByTestId('app-details').getByRole('button', { name: 'Open' }).press('ArrowDown');
  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    await page.getByRole('menuitem', { name: `${process.env.SERVER_IP}:8754` }).click(),
  ]);

  await newPage.waitForLoadState();
  await expect(newPage.getByText('Welcome to nginx!')).toBeVisible();
  await newPage.close();

  // Stop app
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByText('Stop Nginx')).toBeVisible();

  await page.getByRole('button', { name: 'Stop' }).click();

  await expect(page.getByText('Stopping')).toBeVisible();

  // Uninstall app
  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('Uninstall Nginx ?')).toBeVisible();

  await page.getByRole('button', { name: 'Uninstall' }).click();

  await expect(page.getByText('Uninstalling')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Install' })).toBeVisible();
});
