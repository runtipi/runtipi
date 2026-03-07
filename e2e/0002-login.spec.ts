import { expect, test } from '@playwright/test';
import { createTestUser, loginUser } from './fixtures/fixtures';
import { testUser } from './helpers/constants';
import { clearDatabase } from './helpers/db';
import { unsetPasswordChangeRequest } from './helpers/settings';

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

test('reset password page only shows the CLI instructions', async ({ page }) => {
  await unsetPasswordChangeRequest();
  await createTestUser();
  await page.goto('/login');

  await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
  await page.getByRole('link', { name: 'Forgot password?' }).click();

  await expect(page.getByText('./runtipi-cli reset-password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset password' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cancel password change request' })).toHaveCount(0);
  await expect(page.getByPlaceholder('Your new password', { exact: true })).toHaveCount(0);
  await expect(page.getByPlaceholder('Confirm your new password')).toHaveCount(0);
});
