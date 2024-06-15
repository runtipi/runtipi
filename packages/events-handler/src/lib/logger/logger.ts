import { FileLogger } from "@runtipi/shared/node";
import path from "node:path";
import { getEnv } from "../environment";

const { rootFolderHost } = getEnv();

export const logger = new FileLogger(
  "events-handler",
  path.join(rootFolderHost, "logs"),
  true,
);
