import { expect, Page } from '@playwright/test';
import { testUser } from '../helpers/constants';

export const loginUser = async (page: Page) => {
  await page.goto('/login');

  await page.getByPlaceholder('you@example.com').fill(testUser.email);
  await page.getByPlaceholder('Your password').fill(testUser.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeDefined();
};
