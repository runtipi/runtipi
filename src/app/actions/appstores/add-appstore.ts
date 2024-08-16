"use server";

import { authActionClient } from "@/lib/safe-action";
import { SystemServiceClass } from "@/server/services/system";
import { z } from "zod";

const schema = z.object({
  name: z.string().max(16),
  url: z.string().url(),
});

export const addAppstoreAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput: { name, url } }) => {
    const appstores = await SystemServiceClass.getRepositories();
    appstores.push({ [name]: url });
    const result = await SystemServiceClass.writeRepositories(appstores);
    if (result.success) {
      return { success: true };
    }
    return { success: true };
  });
