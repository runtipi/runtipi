import { APP_DATA_DIR, DATA_DIR } from '@/config/constants';
import { EventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';
import { TipiConfig } from '@/server/core/TipiConfig';
import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import { AppDataService } from '@runtipi/shared/node';
import { container } from 'src/inversify.config';
import { CreateAppBackupCommand, DeleteAppBackupCommand, GetAppBackupsCommand, RestoreAppBackupCommand } from './commands';
import type { IAppBackupCommand } from './commands/types';

export const availableCommands = {
  createAppBackup: CreateAppBackupCommand,
  restoreAppBackup: RestoreAppBackupCommand,
  getAppBackups: GetAppBackupsCommand,
  deleteAppBackup: DeleteAppBackupCommand,
} as const;

export type ExecuteAppBackupFunction = <K extends keyof typeof availableCommands>(
  command: K,
  ...args: Parameters<(typeof availableCommands)[K]['prototype']['execute']>
) => Promise<ReturnType<(typeof availableCommands)[K]['prototype']['execute']>>;

class CommandInvoker {
  public async execute(command: IAppBackupCommand, args: unknown[]) {
    return command.execute(...args);
  }
}

export class AppBackupClass {
  private commandInvoker: CommandInvoker;

  constructor(
    private queries: IAppQueries,
    private eventDispatcher: EventDispatcher,
    private appDataService: AppDataService,
  ) {
    this.commandInvoker = new CommandInvoker();
  }

  public executeCommand: ExecuteAppBackupFunction = (command, ...args) => {
    const Command = availableCommands[command];

    if (!Command) {
      throw new Error(`Command ${command} not found`);
    }

    type ReturnValue = Awaited<ReturnType<InstanceType<typeof Command>['execute']>>;

    const constructed = new Command({
      queries: this.queries,
      eventDispatcher: this.eventDispatcher,
      appDataService: this.appDataService,
      executeOtherCommand: this.executeCommand,
    });

    return this.commandInvoker.execute(constructed, args) as Promise<ReturnValue>;
  };
}

export type AppBackup = InstanceType<typeof AppBackupClass>;

const queries = container.get<IAppQueries>('IAppQueries');
const eventDispatcher = new EventDispatcher();
const appDataService = new AppDataService({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId: TipiConfig.getConfig().appsRepoId });

export const appBackupService = new AppBackupClass(queries, eventDispatcher, appDataService);
