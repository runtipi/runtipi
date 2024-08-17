"use server";

import { authActionClient } from "@/lib/safe-action";
import { EventDispatcher } from "@/server/core/EventDispatcher";
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
    const dispatcher = new EventDispatcher();
    appstores[name] = url;
    const result = await SystemServiceClass.writeRepositories(appstores);
    if (result.success) {
      await dispatcher.dispatchEventAsync({
        type: "repo",
        command: "clone",
        urls: Object.values(appstores),
      });
      return { success: true };
    }
    return { success: true };
  });
