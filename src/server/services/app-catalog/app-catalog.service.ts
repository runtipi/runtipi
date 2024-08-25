import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import type { IAppDataService } from '@runtipi/shared/node';
import type { IAppCatalogCache } from './app-catalog-cache';
import { GetAppCommand, GetGuestDashboardApps, GetInstalledAppsCommand } from './commands';
import { ListAppsCommand } from './commands/list-apps-command';
import { SearchAppsCommand } from './commands/search-apps-command';
import type { IAppCatalogCommand } from './commands/types';
import { inject, injectable } from 'inversify';

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

export interface IAppCatalogService {
  executeCommand: ExecuteCatalogFunction;
}

@injectable()
export class AppCatalogService {
  private commandInvoker: CommandInvoker;

  constructor(
    @inject('IAppQueries') private queries: IAppQueries,
    @inject('IAppCatalogCache') private appCatalogCache: IAppCatalogCache,
    @inject('IAppDataService') private appDataService: IAppDataService,
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
