import { AppQueries } from '@/server/queries/apps/apps.queries';
import { EventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';
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
import { IAppLifecycleCommand } from './commands/types';

class CommandInvoker {
  public async execute(command: IAppLifecycleCommand, args: unknown[]) {
    return command.execute(...args);
  }
}

const availableCommands = {
  startApp: StartAppCommand,
  resetApp: ResetAppCommand,
  updateApp: UpdateAppCommand,
  updateAppConfig: UpdateAppConfigCommand,
  stopApp: StopAppCommand,
  restartApp: RestartAppCommand,
  installApp: InstallAppCommand,
  uninstallApp: UninstallAppCommand,
} as const;

export class AppLifecycleClass {
  private commandInvoker: CommandInvoker;

  constructor(
    private queries: AppQueries,
    private eventDispatcher: EventDispatcher,
  ) {
    this.commandInvoker = new CommandInvoker();
  }

  public executeCommand<K extends keyof typeof availableCommands>(
    command: K,
    ...args: Parameters<(typeof availableCommands)[K]['prototype']['execute']>
  ) {
    const Command = availableCommands[command];

    if (!Command) {
      throw new Error(`Command ${command} not found`);
    }

    type ReturnValue = Awaited<ReturnType<InstanceType<typeof Command>['execute']>>;

    const constructed = new Command({ queries: this.queries, eventDispatcher: this.eventDispatcher });

    return this.commandInvoker.execute(constructed, args) as Promise<ReturnValue>;
  }
}

export type AppLifecycle = InstanceType<typeof AppLifecycleClass>;

const queries = new AppQueries();
const eventDispatcher = new EventDispatcher();

export const appLifecycle = new AppLifecycleClass(queries, eventDispatcher);
