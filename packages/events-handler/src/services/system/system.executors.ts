import path from "path";
import { getEnv } from "../../lib/environment";
import { logger } from "../../lib/logger";
import { execAsync, pathExists } from "@runtipi/shared/node";

export class SystemExecutors {
  private readonly logger;

  constructor() {
    this.logger = logger;
  }

  private handleSystemError = (err: unknown) => {
    if (err instanceof Error) {
      this.logger.error(`An error occurred: ${err.message}`);
      return { success: false as const, message: err.message };
    }
    this.logger.error(`An error occurred: ${err}`);

    return {
      success: false as const,
      message: `An error occurred: ${String(err)}`,
    };
  };

  public restartTipi = async () => {
    try {
      const { rootFolderHost, nodeEnv } = getEnv();
      let composeFile = "";

      if (nodeEnv === "development") {
        composeFile = path.join(rootFolderHost, "docker-compose.dev.yml");
      } else if (
        nodeEnv === "production" &&
        (await pathExists(path.join(rootFolderHost, "docker-compose.prod.yml")))
      ) {
        composeFile = path.join(rootFolderHost, "docker-compose.prod.yml");
      } else {
        composeFile = path.join(rootFolderHost, "docker-compose.yml");
      }

      this.logger.info(`Using ${composeFile}`);

      this.logger.info("Restarting runtipi...");
      const result = await execAsync(
        `cd ${rootFolderHost} && docker-compose -f ${composeFile} restart`,
      );

      if (result.stderr.toLowerCase().includes("error")) {
        throw new Error(result.stderr);
      }

      return { success: true, message: "" };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };
}
