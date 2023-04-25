import { test, expect } from '@playwright/test';

import { testUser } from './helpers/constants';
import { clearDatabase } from './helpers/db';

test('user should be redirected to /register', async ({ page }) => {
  await clearDatabase();
  await page.goto('/');

  await page.waitForURL(/register/);

  await expect(page.getByRole('heading', { name: 'Register your account' })).toBeVisible();
});

test('user can register a new account', async ({ page }) => {
  await page.goto('/register');

  await page.getByPlaceholder('you@example.com').click();
  await page.getByPlaceholder('you@example.com').fill(testUser.email);

  await page.getByPlaceholder('Your password', { exact: true }).fill(testUser.password);
  await page.getByPlaceholder('Confirm your password').fill(testUser.password);

  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page).toHaveTitle(/Dashboard/);
});
