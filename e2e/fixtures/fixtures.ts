import { type BrowserContext, type Page, expect } from '@playwright/test';
import * as argon2 from 'argon2';
import { userTable } from '../../packages/backend/src/core/database/schema';
import { testUser } from '../helpers/constants';
import { db } from '../helpers/db';

export const createTestUser = async () => {
  // Create user in database
  const password = await argon2.hash(testUser.password);
  await db.insert(userTable).values({ password, username: testUser.email, operator: true, hasSeenWelcome: true });
};

export const loginUser = async (page: Page, _: BrowserContext) => {
  await page.addLocatorHandler(page.getByText('Insecure configuration'), async () => {
    await page.getByRole('button', { name: 'Close' }).click();
  });

  // Create user in database
  await createTestUser();

  // Login flow
  await page.goto('/login');

  await page.getByPlaceholder('you@example.com').fill(testUser.email);
  await page.getByPlaceholder('Your password').fill(testUser.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
};
