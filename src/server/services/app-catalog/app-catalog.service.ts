import { AppCacheManager } from './app-cache-manager';
import { AppQueries } from '@/server/queries/apps/apps.queries';
import { GetInstalledAppsCommand, GetGuestDashboardApps, GetAppCommand } from './commands';
import { IAppLifecycleCommand } from '../app-lifecycle/commands/types';
import { GetAppBackups } from './commands/get-app-backups';

class CommandInvoker {
  public async execute<T>(command: IAppLifecycleCommand<T>) {
    return command.execute();
  }
}

export class AppCatalogClass {
  private commandInvoker: CommandInvoker;

  constructor(
    private queries: AppQueries,
    private appCacheManager: AppCacheManager,
  ) {
    this.commandInvoker = new CommandInvoker();
  }

  public async listApps() {
    const apps = await this.appCacheManager.getAvailableApps();
    return { apps, total: apps.length };
  }

  public async searchApps(params: { search?: string | null; category?: string | null; pageSize: number; cursor?: string | null }) {
    return this.appCacheManager.searchApps(params);
  }

  public async installedApps() {
    const command = new GetInstalledAppsCommand({ queries: this.queries });
    return this.commandInvoker.execute(command);
  }

  public async getGuestDashboardApps() {
    const command = new GetGuestDashboardApps({ queries: this.queries });
    return this.commandInvoker.execute(command);
  }

  public async getApp(id: string) {
    const command = new GetAppCommand({ queries: this.queries, appId: id });
    return this.commandInvoker.execute(command);
  }

  public async getAppBackups(id: string) {
    const command = new GetAppBackups({ appId: id });
    return this.commandInvoker.execute(command);
  }
}

export type AppCatalog = InstanceType<typeof AppCatalogClass>;

const queries = new AppQueries();
const appCacheManager = new AppCacheManager();

export const appCatalog = new AppCatalogClass(queries, appCacheManager);
