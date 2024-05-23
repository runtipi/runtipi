import * as argon2 from 'argon2';
import { BrowserContext, expect, Page } from '@playwright/test';
import { userTable } from '@/server/db/schema';
import { db } from '../helpers/db';
import { testUser } from '../helpers/constants';

export const createTestUser = async () => {
  // Create user in database
  const password = await argon2.hash(testUser.password);
  await db.insert(userTable).values({ password, username: testUser.email, operator: true });
};

export const loginUser = async (page: Page, context: BrowserContext) => {
  // Create user in database
  await createTestUser();

  await context.addCookies([{ name: 'hide-insecure-instance', value: 'true' }]);

  // Login flow
  await page.goto('/login');

  await page.getByPlaceholder('you@example.com').fill(testUser.email);
  await page.getByPlaceholder('Your password').fill(testUser.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
};
