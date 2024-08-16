"use server";

import { authActionClient } from "@/lib/safe-action";
import { SystemServiceClass } from "@/server/services/system";
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  url: z.string(),
  newName: z.string(),
  newUrl: z.string(),
});

export const editAppstoreAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput: { name, url, newName, newUrl } }) => {
    const appstores = await SystemServiceClass.getRepositories();
    appstores[appstores.findIndex((repo) => Object.keys(repo)[0] === name)] = {
      [newName]: newUrl,
    };
    const result = await SystemServiceClass.writeRepositories(appstores);
    if (result.success) {
      return { success: true };
    }
    return { success: true };
  });
