'use server';

import { DATA_DIR } from '@/config/constants';
import { action } from '@/lib/safe-action';
import { SystemServiceClass } from '@/server/services/system';
import { promises } from 'fs';
import path from 'path';
import z from 'zod';
import { handleActionError } from '../utils/handle-action-error';

const input = z.object({
  appStoreUrl: z.string().url(),
});

export const deleteAppStoreAction = action(input, async ({ appStoreUrl }) => {
  try {
    const systemService = new SystemServiceClass();
    const currentAppStores = await systemService.getAppStores();
    const appStoresConfig = path.join(DATA_DIR, 'state', 'appstores.json');
    const index = currentAppStores.appstores.indexOf(appStoreUrl);

    currentAppStores.appstores.splice(index, 1);

    if (currentAppStores.appstores.length === 0) {
      return { success: false, message: 'One app store is required!' };
    }

    await promises.writeFile(appStoresConfig, JSON.stringify(currentAppStores));

    await systemService.deleteAppStore(appStoreUrl);

    return { success: true };
  } catch (e) {
    await handleActionError(e);
  }
});
