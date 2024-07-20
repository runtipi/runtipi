import { AppQueries } from '@/server/queries/apps/apps.queries';
import { EventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';
import { IAppLifecycleCommand } from './commands/types';
import { AppDataService } from '@runtipi/shared/node';
import { APP_DATA_DIR, DATA_DIR } from '@/config/constants';
import { TipiConfig } from '@/server/core/TipiConfig';
import {
  InstallAppCommand,
  ResetAppCommand,
  RestartAppCommand,
  StartAppCommand,
  StopAppCommand,
  UninstallAppCommand,
  UpdateAppCommand,
  UpdateAppConfigCommand,
  BackupAppCommand,
  RestoreBackupCommand,
} from './commands';

export const availableCommands = {
  startApp: StartAppCommand,
  resetApp: ResetAppCommand,
  updateApp: UpdateAppCommand,
  updateAppConfig: UpdateAppConfigCommand,
  stopApp: StopAppCommand,
  restartApp: RestartAppCommand,
  installApp: InstallAppCommand,
  uninstallApp: UninstallAppCommand,
  backupApp: BackupAppCommand,
  restoreBackup: RestoreBackupCommand,
} as const;

export type ExecuteLifecycleFunction = <K extends keyof typeof availableCommands>(
  command: K,
  ...args: Parameters<(typeof availableCommands)[K]['prototype']['execute']>
) => Promise<ReturnType<(typeof availableCommands)[K]['prototype']['execute']>>;

class CommandInvoker {
  public async execute(command: IAppLifecycleCommand, args: unknown[]) {
    return command.execute(...args);
  }
}

export class AppLifecycleClass {
  private commandInvoker: CommandInvoker;

  constructor(
    private queries: AppQueries,
    private eventDispatcher: EventDispatcher,
    private appDataService: AppDataService,
  ) {
    this.commandInvoker = new CommandInvoker();
  }

  public executeCommand: ExecuteLifecycleFunction = (command, ...args) => {
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

export type AppLifecycle = InstanceType<typeof AppLifecycleClass>;

const queries = new AppQueries();
const eventDispatcher = new EventDispatcher();
const appDataService = new AppDataService({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId: TipiConfig.getConfig().appsRepoId });

export const appLifecycle = new AppLifecycleClass(queries, eventDispatcher, appDataService);
