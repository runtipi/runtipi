export const extractAppId = (id: string) => {
  const separatorIndex = id.indexOf('_');
  if (separatorIndex === -1) {
    throw new Error(`Invalid namespaced app id: ${id}`);
  }
  const storeId = id.substring(0, separatorIndex);
  const appId = id.substring(separatorIndex + 1);

  if (!storeId || !appId) {
    throw new Error(`Invalid namespaced app id: ${id}`);
  }

  return { storeId, appId };
};
