'use server';

import { authActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { getClass } from 'src/inversify.config';

export const updateAllAppsAction = authActionClient.action(async () => {
  const logger = getClass('ILogger');
  const appLifecycle = getClass('IAppLifecycleService');
  const appCatalog = getClass('IAppCatalogService');

  const installedApps = await appCatalog.executeCommand('getInstalledApps');
  const availableUpdates = installedApps.filter((app) => Number(app.version) < Number(app.latestVersion));

  const updatePromises = availableUpdates.map(async (app) => {
    try {
      await appLifecycle.executeCommand('updateApp', { appId: app.id, performBackup: true });
      revalidatePath(`/app/${app.id}`);
      revalidatePath(`/app-store/${app.id}`);
    } catch (e) {
      logger.error(`Failed to update app ${app.id}`, e);
    }
  });

  await Promise.all(updatePromises);

  revalidatePath('/apps');

  return { success: true };
});
