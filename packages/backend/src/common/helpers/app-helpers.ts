export const extractAppId = (id: string) => {
  const [storeId, appId] = id.split('_');

  if (!storeId || !appId) {
    throw new Error(`Invalid namespaced app id: ${id}`);
  }

  return { storeId, appId };
};
