import { test, expect } from '@playwright/test';
import { loginUser } from './fixtures/fixtures';
import { clearDatabase } from './helpers/db';
import { testUser } from './helpers/constants';

test.beforeEach(async ({ page }) => {
  await clearDatabase();
  await loginUser(page);

  await page.goto('/settings');
});

test('user can change their password', async ({ page }) => {
  // Change password
  await page.getByRole('tab', { name: 'Security' }).click();

  await page.getByPlaceholder('Current password').click();
  await page.getByPlaceholder('Current password').fill(testUser.password);
  await page.getByPlaceholder('New password', { exact: true }).click();
  await page.getByPlaceholder('New password', { exact: true }).fill('password2');
  await page.getByPlaceholder('Confirm new password').click();
  await page.getByPlaceholder('Confirm new password').fill('password2');
  await page.getByRole('button', { name: 'Change password' }).click();

  await expect(page.getByText('Password changed successfully')).toBeVisible();

  // Login with new password
  await page.getByPlaceholder('you@example.com').fill(testUser.email);
  await page.getByPlaceholder('Your password').fill('password2');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
