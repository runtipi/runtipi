import { AppQueries } from '@/server/queries/apps/apps.queries';
import { type AppEventFormInput } from '@runtipi/shared';
import { EventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';
import {
  GetAppCommand,
  GetGuestDashboardApps,
  GetInstalledAppsCommand,
  InstallAppCommand,
  ResetAppCommand,
  RestartAppCommand,
  StartAllAppsCommand,
  StartAppCommand,
  StopAppCommand,
  UninstallAppCommand,
  UpdateAppCommand,
  UpdateAppConfigCommand,
} from './commands';
import { AppCacheManager } from './app-cache-manager';
import { ICommand } from './commands/types';

class CommandInvoker {
  public async execute<T>(command: ICommand<T>) {
    return command.execute();
  }
}

export class AppServiceClass {
  private appCacheManager: AppCacheManager;
  private commandInvoker: CommandInvoker;

  constructor(
    private queries: AppQueries,
    private eventDispatcher: EventDispatcher,
  ) {
    this.appCacheManager = new AppCacheManager();
    this.commandInvoker = new CommandInvoker();
  }

  /**
   *  This function starts all apps that are in the 'running' status.
   *  It finds all the running apps and starts them by regenerating the env file, checking the env file and dispatching the start event.
   *  If the start event is successful, the app's status is updated to 'running', otherwise, it is updated to 'stopped'
   *  If there is an error while starting the app, it logs the error and updates the app's status to 'stopped'.
   */
  public async startAllApps() {
    const command = new StartAllAppsCommand(this.queries, this.eventDispatcher);
    await this.commandInvoker.execute(command);
  }

  /**
   * This function starts an app specified by its appName, regenerates its environment file and checks for missing requirements.
   * It updates the app's status in the database to 'starting' and 'running' if the start process is successful, otherwise it updates the status to 'stopped'.
   *
   * @param {string} appId - The name of the app to start
   * @throws {Error} - If the app is not found or the start process fails.
   */
  public startApp = async (appId: string) => {
    const command = new StartAppCommand(appId, this.queries, this.eventDispatcher);
    await this.commandInvoker.execute(command);
  };

  /**
   * Installs an app and updates the status accordingly
   *
   * @param {string} id - The id of the app to be installed
   * @param {Record<string, string>} form - The form data submitted by the user
   */
  public installApp = async (id: string, form: AppEventFormInput) => {
    const command = new InstallAppCommand(id, form, this.queries, this.eventDispatcher);
    await this.commandInvoker.execute(command);
  };

  /**
   * Lists available apps
   */
  public listApps = async () => {
    const apps = await this.appCacheManager.getAvailableApps();
    return { apps, total: apps.length };
  };

  public searchApps = async (params: { search?: string | null; category?: string | null; pageSize: number; cursor?: string | null }) => {
    return this.appCacheManager.searchApps(params);
  };

  /**
   * Update the configuration of an app
   *
   * @param {string} id - The ID of the app to update.
   * @param {object} form - The new configuration of the app.
   */
  public updateAppConfig = async (id: string, form: AppEventFormInput) => {
    const command = new UpdateAppConfigCommand(id, form, this.queries, this.eventDispatcher);
    await this.commandInvoker.execute(command);
  };

  /**
   * Stops a running application by its id
   *
   * @param {string} id - The id of the application to stop
   * @throws {Error} - If the app cannot be found or if stopping the app failed
   */
  public stopApp = async (id: string) => {
    const command = new StopAppCommand(id, this.queries, this.eventDispatcher);
    await this.commandInvoker.execute(command);
  };

  /**
   * Uninstalls an app by stopping it, running the app's `uninstall` script, and removing its data
   *
   * @param {string} id - The id of the app to uninstall
   * @throws {Error} - If the app is not found or if the app's `uninstall` script fails
   */
  public uninstallApp = async (id: string) => {
    const command = new UninstallAppCommand(id, this.queries, this.eventDispatcher);
    await this.commandInvoker.execute(command);
  };

  /**
   * Reset App with the specified ID
   *
   * @param {string} id - ID of the app to reset
   * @throws {Error} - If the app is not found or if the update process fails.
   */
  public resetApp = async (id: string) => {
    const command = new ResetAppCommand(id, this.queries, this.eventDispatcher);
    await this.commandInvoker.execute(command);
  };

  /**
   * Restarts a running application by its id
   *
   * @param {string} id - The id of the application to restart
   * @throws {Error} - If the app cannot be found or if restarting the app failed
   */
  public restartApp = async (id: string) => {
    const command = new RestartAppCommand(id, this.queries, this.eventDispatcher);
    await this.commandInvoker.execute(command);
  };

  /**
   * Returns the app with the provided id. If the app is not found, it returns a default app object
   *
   * @param {string} id - The id of the app to retrieve
   */
  public getApp = async (id: string) => {
    const command = new GetAppCommand(id, this.queries);
    return this.commandInvoker.execute(command);
  };

  /**
   * Updates an app with the specified ID
   *
   * @param {string} id - ID of the app to update
   * @throws {Error} - If the app is not found or if the update process fails.
   */
  public updateApp = async (id: string) => {
    const command = new UpdateAppCommand(id, this.queries, this.eventDispatcher);
    await this.commandInvoker.execute(command);
  };

  /**
   * Returns a list of all installed apps
   */
  public installedApps = async () => {
    const command = new GetInstalledAppsCommand(this.queries);
    return this.commandInvoker.execute(command);
  };

  public getGuestDashboardApps = async () => {
    const command = new GetGuestDashboardApps(this.queries);
    return this.commandInvoker.execute(command);
  };
}

export type AppService = InstanceType<typeof AppServiceClass>;

const queries = new AppQueries();
const eventDispatcher = new EventDispatcher('appService');

export const appService = new AppServiceClass(queries, eventDispatcher);
