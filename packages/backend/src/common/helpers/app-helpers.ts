import type { AppUrn } from '@/types/app/app.types';

export const extractAppId = (id: AppUrn) => {
  const separatorIndex = id.indexOf(':');
  if (separatorIndex === -1) {
    throw new Error(`Invalid namespaced app id: ${id}`);
  }
  const appId = id.substring(0, separatorIndex);
  const storeId = id.substring(separatorIndex + 1);

  if (!storeId || !appId) {
    throw new Error(`Invalid namespaced app id: ${id}`);
  }

  return { storeId, appId };
};

export const extractAppUrn = (id: AppUrn) => {
  const separatorIndex = id.indexOf(':');
  if (separatorIndex === -1) {
    throw new Error(`Invalid namespaced app id: ${id}`);
  }
  const appName = id.substring(0, separatorIndex);
  const appstore = id.substring(separatorIndex + 1);

  if (!appstore || !appName) {
    throw new Error(`Invalid namespaced app id: ${id}`);
  }

  return { appName, appstore };
};

export const createAppUrn = (appName: string, appstore: string) => {
  return `${appName}:${appstore}` as AppUrn;
};
