import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import { GetInstalledAppsCommand, GetGuestDashboardApps, GetAppCommand } from './commands';
import { AppDataService } from '@runtipi/shared/node';
import { APP_DATA_DIR, DATA_DIR } from '@/config/constants';
import { TipiConfig } from '@/server/core/TipiConfig';
import { SearchAppsCommand } from './commands/search-apps-command';
import { ListAppsCommand } from './commands/list-apps-command';
import { AppCatalogCache } from './app-catalog-cache';
import type { IAppCatalogCommand } from './commands/types';
import { container } from 'src/inversify.config';

const availableCommands = {
  getInstalledApps: GetInstalledAppsCommand,
  getGuestDashboardApps: GetGuestDashboardApps,
  getApp: GetAppCommand,
  searchApps: SearchAppsCommand,
  listApps: ListAppsCommand,
} as const;

export type ExecuteCatalogFunction = <K extends keyof typeof availableCommands>(
  command: K,
  ...args: Parameters<(typeof availableCommands)[K]['prototype']['execute']>
) => Promise<ReturnType<(typeof availableCommands)[K]['prototype']['execute']>>;

class CommandInvoker {
  public async execute(command: IAppCatalogCommand, args: unknown[]) {
    return command.execute(...args);
  }
}

export class AppCatalogClass {
  private commandInvoker: CommandInvoker;

  constructor(
    private queries: IAppQueries,
    private appCatalogCache: AppCatalogCache,
    private appDataService: AppDataService,
  ) {
    this.commandInvoker = new CommandInvoker();
  }

  public executeCommand: ExecuteCatalogFunction = (command, ...args) => {
    const Command = availableCommands[command];

    if (!Command) {
      throw new Error(`Command ${command} not found`);
    }

    type ReturnValue = Awaited<ReturnType<InstanceType<typeof Command>['execute']>>;

    const constructed = new Command({
      queries: this.queries,
      appDataService: this.appDataService,
      appCatalogCache: this.appCatalogCache,
    });

    return this.commandInvoker.execute(constructed, args) as Promise<ReturnValue>;
  };
}

export type AppCatalog = InstanceType<typeof AppCatalogClass>;

const queries = container.get<IAppQueries>('IAppQueries');
const appDataService = new AppDataService({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId: TipiConfig.getConfig().appsRepoId });
const appCacheManager = new AppCatalogCache(appDataService);

export const appCatalog = new AppCatalogClass(queries, appCacheManager, appDataService);
