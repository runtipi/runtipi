"use server";

import { authActionClient } from "@/lib/safe-action";
import { EventDispatcher } from "@/server/core/EventDispatcher";
import { SystemServiceClass } from "@/server/services/system";
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  newName: z.string(),
  newUrl: z.string(),
});

export const editAppstoreAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput: { name, newName, newUrl } }) => {
    const appstores = await SystemServiceClass.getRepositories();
    const dispatcher = new EventDispatcher();
    delete Object.assign(appstores, { [newName]: appstores[name] })[name];
    appstores[newName] = newUrl;
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
