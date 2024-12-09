import { type BrowserContext, type Page, expect } from '@playwright/test';
import * as argon2 from 'argon2';
import { user } from '../../packages/backend/src/core/database/drizzle/schema';
import { testUser } from '../helpers/constants';
import { db } from '../helpers/db';

export const createTestUser = async () => {
  // Create user in database
  const password = await argon2.hash(testUser.password);
  await db.insert(user).values({ password, username: testUser.email, operator: true, hasSeenWelcome: true });
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

type InstallAppOpts = {
  visibleOnGuestDashboard?: boolean;
  domain?: string;
};

export const installApp = async (page: Page, storeId: number, appId: string, opts: InstallAppOpts = {}) => {
  await page.goto(`/app-store/${storeId}/${appId}`);

  // Install app
  await page.getByRole('button', { name: 'Install' }).click();

  await expect(page.getByText('Display on guest dashboard')).toBeVisible();

  if (opts.visibleOnGuestDashboard) {
    await page.getByLabel('isVisibleOnGuestDashboard').setChecked(true);
  }

  if (opts.domain) {
    await page.getByLabel('exposed', { exact: true }).setChecked(true);
    await page.getByPlaceholder('Domain name').fill(opts.domain);
  }

  await page.getByRole('button', { name: 'Install' }).click();

  await expect(page.getByText('Installing')).toBeVisible();
  await expect(page.getByText('Running')).toBeVisible({ timeout: 60000 });
};
