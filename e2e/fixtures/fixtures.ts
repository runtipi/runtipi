import { expect, Page } from '@playwright/test';
import { testUser } from '../helpers/constants';

export const registerUser = async (page: Page) => {
  await page.goto('/register');
  await page.getByPlaceholder('you@example.com').click();
  await page.getByPlaceholder('you@example.com').fill(testUser.email);

  await page.getByPlaceholder('Enter your password', { exact: true }).fill(testUser.password);
  await page.getByPlaceholder('Confirm your password').fill(testUser.password);

  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page).toHaveTitle(/Dashboard/);
};

export const loginUser = async (page: Page) => {
  await page.goto('/login');

  await page.getByPlaceholder('you@example.com').fill(testUser.email);
  await page.getByPlaceholder('Your password').fill(testUser.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeDefined();
};
