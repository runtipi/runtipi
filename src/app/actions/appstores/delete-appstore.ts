"use server";

import { authActionClient } from "@/lib/safe-action";
import { SystemServiceClass } from "@/server/services/system";
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  url: z.string(),
});

export const deleteAppstoreAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput: { name, url } }) => {
    const appstores = await SystemServiceClass.getRepositories();
    appstores.splice(appstores.indexOf({ [name]: url }), 1);
    const result = await SystemServiceClass.writeRepositories(appstores);
    if (result.success) {
      return { success: true };
    }
    return { success: true };
  });
