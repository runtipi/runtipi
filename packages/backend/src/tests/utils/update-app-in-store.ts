import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '@/common/constants';
import type { AppInfo } from '@runtipi/common/schemas';

export const updateAppInStore = async (storeId: string, appId: string, newConfig: Partial<AppInfo> = {}) => {
  const appStorePath = `${DATA_DIR}/repos/${storeId}/apps/${appId}`;

  const appConfig = JSON.parse(await fs.promises.readFile(path.join(appStorePath, 'config.json'), 'utf-8'));

  await fs.promises.writeFile(path.join(appStorePath, 'config.json'), JSON.stringify({ ...appConfig, ...newConfig }, null, 2));

  return { ...appConfig, ...newConfig } as AppInfo;
};
