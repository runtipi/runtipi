import path from 'node:path';
import { expect, test } from '@playwright/test';
import { eq } from 'drizzle-orm';
import { app } from '../packages/backend/src/core/database/drizzle/schema';
import { installApp, loginUser } from './fixtures/fixtures';
import { clearDatabase, db } from './helpers/db';
import { deleteFile, readFile, writeFile } from './helpers/settings';

test.beforeEach(async ({ page, context }) => {
  await clearDatabase();
  await loginUser(page, context);
});

test('user can backup and restore an app', async ({ page }) => {
  test.slow();

  const store = await db.query.appStore.findFirst();
  if (!store) {
    throw new Error('No store found');
  }

  // Update the version of the app
  let file = await readFile(path.join('repos', store.slug, 'apps', 'whoami', 'config.json'));
  const config = JSON.parse(file);
  config.tipi_version = 0;
  await writeFile(path.join('repos', store.slug, 'apps', 'whoami', 'config.json'), JSON.stringify(config));

  await installApp(page, store.slug, 'whoami');

  // Ensure the app has version 0
  let dbapp = await db.query.app.findFirst({ where: eq(app.appName, 'whoami') });
  expect(dbapp?.version).toBe(0);

  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Update' }).click();
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByText('Appstores updated successfully')).toBeVisible({ timeout: 10000 });

  await page.goto(`/app-store/${store.slug}/whoami`);

  await page.getByRole('button', { name: 'Update' }).click();
  await page.getByRole('button', { name: 'Update' }).click();

  await expect(page.getByText('Updating')).toBeVisible();
  await expect(page.getByText('Running')).toBeVisible({ timeout: 60000 });

  dbapp = await db.query.app.findFirst({ where: eq(app.appName, 'whoami') });
  expect(dbapp?.version).toBe(1);

  await page.getByRole('tab', { name: 'Backups' }).click();

  await page.getByRole('tab', { name: 'Backups' }).click();
  await page.getByRole('button', { name: 'Restore' }).click();
  await page.getByRole('button', { name: 'Restore' }).click();

  await expect(page.getByText('Restoring')).toBeVisible();
  await expect(page.getByText('Running')).toBeVisible({ timeout: 60000 });

  dbapp = await db.query.app.findFirst({ where: eq(app.appName, 'whoami') });
  expect(dbapp?.version).toBe(0);
  file = await readFile(path.join('apps', store.slug, 'whoami', 'config.json'));
  const restoredConfig = JSON.parse(file);
  expect(restoredConfig.tipi_version).toBe(0);
});

test('user config is preserved when restoring from a backup', async ({ page }) => {
  test.slow();

  const store = await db.query.appStore.findFirst();
  if (!store) {
    throw new Error('No store found');
  }

  await installApp(page, store.slug, 'whoami', { visibleOnGuestDashboard: false });
  await writeFile(path.join('user-config', store.slug, 'whoami', 'docker-compose.yml'), 'version: "3.9"');

  // Create a backup
  await page.getByRole('tab', { name: 'Backups' }).click();
  await page.getByRole('button', { name: 'Backup now' }).click();
  await expect(page.getByText('Backup Whoami')).toBeVisible();
  await page.getByRole('button', { name: 'Backup' }).click();

  // Wait for backup to complete
  await expect(page.getByText('Backing up')).toBeVisible();
  await expect(page.getByText('Running')).toBeVisible({ timeout: 60000 });

  await deleteFile(path.join('user-config', store.slug, 'whoami', 'docker-compose.yml'));

  const notFound = await readFile(path.join('user-config', store.slug, 'whoami', 'docker-compose.yml')).catch(() => {
    return true;
  });

  expect(notFound).toBe(true);

  // Restore from backup
  await page.getByRole('tab', { name: 'Backups' }).click();
  await page.getByRole('button', { name: 'Restore' }).click();
  await page.getByRole('button', { name: 'Restore' }).click();

  // Wait for restore to complete
  await expect(page.getByText('Restoring')).toBeVisible();
  await expect(page.getByText('Running')).toBeVisible({ timeout: 60000 });

  const file = await readFile(path.join('user-config', store.slug, 'whoami', 'docker-compose.yml'));
  expect(file).toBe('version: "3.9"');
});
