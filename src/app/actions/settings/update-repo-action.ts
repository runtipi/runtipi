"use server";

import { authActionClient } from "@/lib/safe-action";
import { AppCatalogCache } from "@/server/services/app-catalog/app-catalog-cache";
import { getClass } from "src/inversify.config";
import { z } from "zod";

export const updateRepoAction = authActionClient
  .schema(z.void())
  .action(async () => {
    const systemService = getClass("ISystemService");
    const dataService = getClass("IAppDataService");
    const appCatalogCache = new AppCatalogCache(dataService);
    await systemService.updateRepos();
    appCatalogCache.invalidateCache();
    return { success: true };
  });
