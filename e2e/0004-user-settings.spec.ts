import { test, expect } from '@playwright/test';
import { loginUser } from './fixtures/fixtures';
import { clearDatabase } from './helpers/db';
import { testUser } from './helpers/constants';
import { setSettings } from './helpers/settings';

test.beforeEach(async ({ page }) => {
  await setSettings({});
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

test('user can change their email', async ({ page }) => {
  // Change email
  const newEmail = 'tester2@test.com';

  await page.getByRole('tab', { name: 'Security' }).click();
  await page.getByRole('button', { name: 'Change username' }).click();
  await page.getByPlaceholder('New username').click();
  await page.getByPlaceholder('New username').fill(newEmail);

  // Wrong password
  await page.getByPlaceholder('Password', { exact: true }).click();
  await page.getByPlaceholder('Password', { exact: true }).fill('incorrect');

  await page.getByRole('button', { name: 'Change username' }).click();

  await expect(page.getByText('Invalid password')).toBeVisible();

  // Wrong email
  await page.getByPlaceholder('Password', { exact: true }).click();
  await page.getByPlaceholder('Password', { exact: true }).fill(testUser.password);
  await page.getByPlaceholder('New username').click();
  await page.getByPlaceholder('New username').fill('incorrect');

  await page.getByRole('button', { name: 'Change username' }).click();

  await expect(page.getByText('Must be a valid email address')).toBeVisible();

  // Correct email and password
  await page.getByPlaceholder('New username').click();
  await page.getByPlaceholder('New username').fill(newEmail);

  await page.getByRole('button', { name: 'Change username' }).click();

  await expect(page.getByText('Username changed successfully')).toBeVisible();

  // Login with new email
  await page.getByPlaceholder('you@example.com').click();
  await page.getByPlaceholder('you@example.com').fill(newEmail);
  await page.getByPlaceholder('Your password').click();
  await page.getByPlaceholder('Your password').fill(testUser.password);

  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
