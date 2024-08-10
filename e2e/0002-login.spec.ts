import { expect, test } from '@playwright/test';
import { createTestUser, loginUser } from './fixtures/fixtures';
import { testUser } from './helpers/constants';
import { clearDatabase } from './helpers/db';
import { setPassowrdChangeRequest, unsetPasswordChangeRequest } from './helpers/settings';

test.beforeEach(async () => {
  await clearDatabase();
});

test('user can login and is redirected to the dashboard', async ({ page }) => {
  await createTestUser();
  await page.goto('/login');

  await page.getByPlaceholder('you@example.com').fill(testUser.email);
  await page.getByPlaceholder('Your password').fill(testUser.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('user can logout', async ({ page, context }) => {
  await loginUser(page, context);
  await page.getByTestId('logout-button').click();

  await expect(page.getByText('Login to your account')).toBeVisible();
});

test('user can reset their password', async ({ page }) => {
  // Create password change request
  await unsetPasswordChangeRequest();

  await createTestUser();
  await page.goto('/login');

  await page.getByRole('link', { name: 'Forgot password?' }).click();

  await expect(page.getByText('./runtipi-cli reset-password')).toBeVisible();
  await setPassowrdChangeRequest();

  await page.reload();

  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  await page.getByPlaceholder('Your new password', { exact: true }).fill('new-password');
  await page.getByPlaceholder('Confirm your new password').fill('new-password');

  await page.getByRole('button', { name: 'Reset password' }).click();

  await page.getByRole('button', { name: 'Back to login' }).click();

  await page.getByPlaceholder('you@example.com').fill(testUser.email);
  await page.getByPlaceholder('Your password').fill('new-password');

  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
