'use server';

import { action } from '@/lib/safe-action';
import { z } from 'zod';
import { appLifecycle } from '@/server/services/app-lifecycle/app-lifecycle.service';
import { appCatalog } from '@/server/services/app-catalog/app-catalog.service';
import { revalidatePath } from 'next/cache';
import { ensureUser } from '../utils/ensure-user';
import { handleActionError } from '../utils/handle-action-error';
import { Logger } from '@/server/core/Logger';

const updateAllInput = z.void();

export const updateAllAppsAction = action(updateAllInput, async () => {
  try {
    await ensureUser();
    const installedApps = await appCatalog.executeCommand('getInstalledApps');
    const availableUpdates = installedApps.filter((app) => Number(app.version) < Number(app.latestVersion));

    const updatePromises = availableUpdates.map(async (app) => {
      try {
        await appLifecycle.executeCommand('updateApp', { appId: app.id });
        revalidatePath(`/app/${app.id}`);
        revalidatePath(`/app-store/${app.id}`);
      } catch (e) {
        Logger.error(`Failed to update app ${app.id}`, e);
      }
    });

    await Promise.all(updatePromises);

    revalidatePath('/apps');

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
