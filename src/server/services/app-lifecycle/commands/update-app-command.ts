import { castAppConfig } from "@/lib/helpers/castAppConfig";
import type { EventDispatcher } from "@/server/core/EventDispatcher";
import { Logger } from "@/server/core/Logger";
import { TipiConfig } from "@/server/core/TipiConfig";
import type { IAppQueries } from "@/server/queries/apps/apps.queries";
import { TranslatedError } from "@/server/utils/errors";
import type { AppStatus } from "@runtipi/db";
import type { AppEventFormInput } from "@runtipi/shared";
import type { AppDataService } from "@runtipi/shared/node";
import semver from "semver";
import type { AppLifecycleCommandParams, IAppLifecycleCommand } from "./types";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export class UpdateAppCommand implements IAppLifecycleCommand {
  private queries: IAppQueries;
  private eventDispatcher: EventDispatcher;
  private appDataService: AppDataService;
  private executeOtherCommand: IAppLifecycleCommand["execute"];

  constructor(params: AppLifecycleCommandParams) {
    this.queries = params.queries;
    this.eventDispatcher = params.eventDispatcher;
    this.appDataService = params.appDataService;
    this.executeOtherCommand = params.executeOtherCommand;
  }

  private async sendEvent(params: {
    appId: string;
    form: AppEventFormInput;
    appStatusBeforeUpdate: AppStatus;
    performBackup: boolean;
  }): Promise<void> {
    const { appId, form, appStatusBeforeUpdate, performBackup } = params;

    const { success, stdout } = await this.eventDispatcher.dispatchEventAsync({
      type: "app",
      command: "update",
      appid: appId,
      form,
      performBackup,
    });

    if (success) {
      const appInfo = await this.appDataService.getInstalledInfo(appId);

      await this.queries.updateApp(appId, { version: appInfo?.tipi_version });

      if (appStatusBeforeUpdate === "running") {
        await this.executeOtherCommand("startApp", { appId });
      } else {
        await this.queries.updateApp(appId, { status: appStatusBeforeUpdate });
      }
    } else {
      await this.queries.updateApp(appId, { status: "stopped" });
      Logger.error(`Failed to update app ${appId}: ${stdout}`);
    }
  }

  async execute(params: {
    appId: string;
    performBackup: boolean;
  }): Promise<void> {
    const { appId, performBackup } = params;
    const app = await this.queries.getApp(appId);

    if (!app) {
      throw new TranslatedError("APP_ERROR_APP_NOT_FOUND", { id: appId });
    }

    const { version } = TipiConfig.getConfig();

    const { minTipiVersion } = await this.appDataService.getUpdateInfo(appId);
    if (
      minTipiVersion &&
      semver.valid(version) &&
      semver.lt(version, minTipiVersion)
    ) {
      throw new TranslatedError("APP_UPDATE_ERROR_MIN_TIPI_VERSION", {
        id: appId,
        minVersion: minTipiVersion,
      });
    }

    await this.queries.updateApp(appId, { status: "updating" });

    void this.sendEvent({
      appId,
      form: castAppConfig(app.config),
      appStatusBeforeUpdate: app.status || "missing",
      performBackup,
    });
  }
}
