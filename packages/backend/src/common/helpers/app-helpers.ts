import type { AppUrn } from '@/types/app/app.types';

export const extractAppUrn = (id: AppUrn) => {
  const separatorIndex = id.indexOf(':');
  if (separatorIndex === -1) {
    throw new Error(`Invalid App URN: ${id}`);
  }
  const appName = id.substring(0, separatorIndex);
  const appStoreId = id.substring(separatorIndex + 1);

  if (!appStoreId || !appName) {
    throw new Error(`Invalid App URN: ${id}`);
  }

  return { appName, appStoreId };
};

export const createAppUrn = (appName: string, appstore: string) => {
  return `${appName}:${appstore}` as AppUrn;
};

export const castAppUrn = (id: string): AppUrn => {
  // Validate app URN
  const separatorIndex = id.indexOf(':');
  if (separatorIndex === -1) {
    throw new Error(`Invalid namespaced app id: ${id}`);
  }

  return id as AppUrn;
};
