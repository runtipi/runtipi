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
});

export const addAppStoreAction = action(input, async ({ appStoreUrl }) => {
  try {
    const systemService = new SystemServiceClass();
    const currentAppStores = await systemService.getAppStores();
    const appStoresConfig = path.join(DATA_DIR, 'state', 'appstores.json');
    let exists = false;

    currentAppStores.appstores.forEach((store) => {
      if (appStoreUrl === store) {
        exists = true;
      }
    });

    if (exists) {
      return { success: false, message: 'App store already exists!' };
    }

    await promises.writeFile(appStoresConfig, JSON.stringify({ appstores: [...currentAppStores.appstores, appStoreUrl] }));

    return { success: true };
  } catch (e) {
    await handleActionError(e);
  }
});
