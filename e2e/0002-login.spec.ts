import fs from 'fs';
import { test, expect } from '@playwright/test';
import { loginUser, createTestUser } from './fixtures/fixtures';
import { testUser } from './helpers/constants';
import { clearDatabase } from './helpers/db';

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

test('user can logout', async ({ page }) => {
  await loginUser(page);
  await page.getByTestId('logout-button').click();

  await expect(page.getByText('Login to your account')).toBeVisible();
});

test('user can reset their password', async ({ page }) => {
  // Create password change request
  if (fs.existsSync('./state/password-change-request')) {
    await fs.promises.unlink('./state/password-change-request');
  }

  await createTestUser();
  await page.goto('/login');

  await page.getByRole('link', { name: 'Forgot password?' }).click();

  await expect(page.getByText('./runtipi-cli reset-password')).toBeVisible();
  await fs.promises.writeFile('./state/password-change-request', '');

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
