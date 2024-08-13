import path from 'path';
import { DATA_DIR } from '../config';
import { getEnv } from '@/lib/environment';
import { promises } from 'fs';
import { appInfoSchema } from '@runtipi/shared';

export const getAvailableApps = async (directory: string) => {
  try {
    const ignoreList = ['__tests__', 'schema.json'];
    const arch = getEnv().arch;
    let availableApps: string[] = [];
    for (const app of await promises.readdir(directory)) {
      if (ignoreList.indexOf(app) === -1) {
        const configRaw = promises.readFile(path.join(directory, app, 'config.json'), 'utf-8');
        const configParsed = await appInfoSchema.safeParseAsync(configRaw);
        if (configParsed.success) {
          if (directory === path.join(DATA_DIR, 'apps')) {
            availableApps.push(app);
          } else {
            if (
              configParsed.data.deprecated !== true &&
              configParsed.data.supported_architectures?.indexOf(arch) !== -1
            ) {
              availableApps.push(app);
            }
          }
        }
      }
    }
    return { success: true, error: '', appList: availableApps };
  } catch (e) {
    return { success: false, error: e, appList: [''] };
  }
};

export const validateApp = async (appId: string) => {
  const repoApps = await getAvailableApps(
    path.join(DATA_DIR, 'repos', getEnv().appsRepoId, 'apps'),
  );
  const localApps = await getAvailableApps(path.join(DATA_DIR, 'apps'));
  if (repoApps.success && localApps.success) {
    if (repoApps.appList.indexOf(appId) !== -1 && localApps.appList.indexOf(appId) !== -1) {
      return { exists: true };
    }
    return { exists: false };
  }
};
