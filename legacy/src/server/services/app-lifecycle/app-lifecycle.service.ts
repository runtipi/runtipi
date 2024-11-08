import type { IEventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';
import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import type { IAppDataService, IAppFileAccessor } from '@runtipi/shared/node';
import {
  InstallAppCommand,
  ResetAppCommand,
  RestartAppCommand,
  StartAppCommand,
  StopAppCommand,
  UninstallAppCommand,
  UpdateAppCommand,
  UpdateAppConfigCommand,
} from './commands';
import type { IAppLifecycleCommand } from './commands/types';
import { inject, injectable } from 'inversify';

export const availableCommands = {
  startApp: StartAppCommand,
  resetApp: ResetAppCommand,
  updateApp: UpdateAppCommand,
  updateAppConfig: UpdateAppConfigCommand,
  stopApp: StopAppCommand,
  restartApp: RestartAppCommand,
  installApp: InstallAppCommand,
  uninstallApp: UninstallAppCommand,
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

export interface IAppLifecycleService {
  executeCommand: ExecuteLifecycleFunction;
}

@injectable()
export class AppLifecycleService {
  private commandInvoker: CommandInvoker;

  constructor(
    @inject('IAppQueries') private queries: IAppQueries,
    @inject('IEventDispatcher') private eventDispatcher: IEventDispatcher,
    @inject('IAppDataService') private appDataService: IAppDataService,
    @inject('IAppFileAccessor') private appFileAccessor: IAppFileAccessor,
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
      appFileAccessor: this.appFileAccessor,
      queries: this.queries,
      eventDispatcher: this.eventDispatcher,
      appDataService: this.appDataService,
      executeOtherCommand: this.executeCommand,
    });

    return this.commandInvoker.execute(constructed, args) as Promise<ReturnValue>;
  };
}

export type AppLifecycle = InstanceType<typeof AppLifecycleService>;
