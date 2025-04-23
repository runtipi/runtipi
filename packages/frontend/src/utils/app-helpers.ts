import type { AppUrn } from '@runtipi/common/types';

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
