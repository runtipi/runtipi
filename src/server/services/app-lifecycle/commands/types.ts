import { EventDispatcher } from '@/server/core/EventDispatcher';
import { AppQueries } from '@/server/queries/apps/apps.queries';
import { AppDataService } from '@runtipi/shared/node';

export interface IAppLifecycleCommand<T = unknown> {
  execute(...args: unknown[]): Promise<T>;
}

export type AppLifecycleCommandParams = {
  queries: AppQueries;
  eventDispatcher: EventDispatcher;
  appDataService: AppDataService;
  executeOtherCommand: IAppLifecycleCommand['execute'];
};
