import { expect, test } from '@playwright/test';

import { testUser } from './helpers/constants';
import { clearDatabase } from './helpers/db';
import { setWelcomeSeen } from './helpers/settings';

test.beforeEach(async () => {
  await clearDatabase();
});

test('user should be redirected to /register', async ({ page }) => {
  await page.goto('/');

  await page.waitForURL(/register/);

  await expect(page.getByRole('heading', { name: 'Register your account' })).toBeVisible();
});

test('user can register a new account', async ({ page }) => {
  await setWelcomeSeen(false);
  await page.goto('/register');

  await page.getByPlaceholder('you@example.com').click();
  await page.getByPlaceholder('you@example.com').fill(testUser.email);

  await page.getByPlaceholder('Enter your password', { exact: true }).fill(testUser.password);
  await page.getByPlaceholder('Confirm your password').fill(testUser.password);

  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByRole('heading', { name: 'Thanks for using Runtipi' })).toBeVisible();
  await page.getByRole('button', { name: 'Save and enter' }).click();
});
