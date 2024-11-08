import type { IEventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';
import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import type { IAppDataService, IBackupManager } from '@runtipi/shared/node';
import { CreateAppBackupCommand, DeleteAppBackupCommand, GetAppBackupsCommand, RestoreAppBackupCommand } from './commands';
import type { IAppBackupCommand } from './commands/types';
import { inject, injectable } from 'inversify';

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

export interface IAppBackupService {
  executeCommand: ExecuteAppBackupFunction;
}

@injectable()
export class AppBackupService {
  private commandInvoker: CommandInvoker;

  constructor(
    @inject('IAppQueries') private queries: IAppQueries,
    @inject('IEventDispatcher') private eventDispatcher: IEventDispatcher,
    @inject('IAppDataService') private appDataService: IAppDataService,
    @inject('IBackupManager') private backupManager: IBackupManager,
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
      backupManager: this.backupManager,
      executeOtherCommand: this.executeCommand,
    });

    return this.commandInvoker.execute(constructed, args) as Promise<ReturnValue>;
  };
}

export type AppBackup = InstanceType<typeof AppBackupService>;
