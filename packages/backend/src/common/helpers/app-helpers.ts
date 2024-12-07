export const extractAppId = (id: string) => {
  const separatorIndex = id.indexOf('_');
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
