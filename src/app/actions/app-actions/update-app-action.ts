'use server';

import { z } from 'zod';
import { db } from '@/server/db';
import { action } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { AppServiceClass } from '@/server/services/apps/apps.service';
import { handleActionError } from '../utils/handle-action-error';
import { ensureUser } from '../utils/ensure-user';

const input = z.object({ id: z.string() });
const updateAllInput = z.void();

/**
 * Given an app id, updates the app to the latest version
 */
export const updateAppAction = action(input, async ({ id }) => {
  try {
    await ensureUser();

    const appsService = new AppServiceClass(db);
    await appsService.updateApp(id);

    revalidatePath('/apps');
    revalidatePath(`/app/${id}`);
    revalidatePath(`/app-store/${id}`);

    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
 
export const updateAllAppsAction = action(updateAllInput, async () => {
  const appsService = new AppServiceClass(db);
  const installedApps = await appsService.installedApps();

  try {
    installedApps.forEach((app) => {
      updateAppAction({ id: app.id });
    });
  
    return { success: true };
  } catch (e) {
    return handleActionError(e);
  }
});
