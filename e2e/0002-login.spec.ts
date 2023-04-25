import { test, expect } from '@playwright/test';
import { loginUser } from './fixtures/fixtures';
import { testUser } from './helpers/constants';

test('user can login and is redirected to the dashboard', async ({ page }) => {
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
