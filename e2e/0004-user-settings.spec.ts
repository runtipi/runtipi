import { test, expect } from '@playwright/test';
import { eq } from 'drizzle-orm';
import { userTable } from '@/server/db/schema';
import { loginUser } from './fixtures/fixtures';
import { clearDatabase, db } from './helpers/db';
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

test('user can change their language and it is persisted in database', async ({ page }) => {
  await page.getByRole('tab', { name: 'Settings' }).click();

  await page.getByRole('combobox', { name: 'Language Help translate Tipi' }).click();
  await page.getByRole('option', { name: 'Français' }).click();

  await expect(page.getByText('Paramètres utilisateur')).toBeVisible();

  const dbUser = await db.query.userTable.findFirst({ where: eq(userTable.username, testUser.email) });
  expect(dbUser?.locale).toEqual('fr-FR');
});
