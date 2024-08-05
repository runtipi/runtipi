'use server';

import { appLifecycle } from '@/server/services/app-lifecycle/app-lifecycle.service';
import { appCatalog } from '@/server/services/app-catalog/app-catalog.service';
import { revalidatePath } from 'next/cache';
import { Logger } from '@/server/core/Logger';
import { authActionClient } from '@/lib/safe-action';

export const updateAllAppsAction = authActionClient.action(async () => {
  const installedApps = await appCatalog.executeCommand('getInstalledApps');
  const availableUpdates = installedApps.filter((app) => Number(app.version) < Number(app.latestVersion));

  const updatePromises = availableUpdates.map(async (app) => {
    try {
      await appLifecycle.executeCommand('updateApp', { appId: app.id, performBackup: true });
      revalidatePath(`/app/${app.id}`);
      revalidatePath(`/app-store/${app.id}`);
    } catch (e) {
      Logger.error(`Failed to update app ${app.id}`, e);
    }
  });

  await Promise.all(updatePromises);

  revalidatePath('/apps');

  return { success: true };
});
