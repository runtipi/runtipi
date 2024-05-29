'use server';

import { DATA_DIR } from '@/config/constants';
import { action } from '@/lib/safe-action';
import { SystemServiceClass } from '@/server/services/system';
import path from 'path';
import z from 'zod';
import { handleActionError } from '../utils/handle-action-error';
import { promises } from 'fs';

const input = z.object({
  appStoreUrl: z.string().url(),
  newAppStoreUrl: z.string().url(),
});

export const editAppStoreAction = action(input, async ({ appStoreUrl, newAppStoreUrl }) => {
  try {
    const systemService = new SystemServiceClass();
    const currentAppStores = await systemService.getAppStores();
    const appStoresConfig = path.join(DATA_DIR, 'state', 'appstores.json');
    const index = currentAppStores.appstores.indexOf(appStoreUrl);

    currentAppStores.appstores[index] = newAppStoreUrl;

    await promises.writeFile(appStoresConfig, JSON.stringify(currentAppStores));

    return { success: true };
  } catch (e) {
    handleActionError(e);
  }
});
