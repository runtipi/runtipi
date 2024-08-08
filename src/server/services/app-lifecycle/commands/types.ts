import type { EventDispatcher } from '@/server/core/EventDispatcher';
import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import type { AppDataService } from '@runtipi/shared/node';

export interface IAppLifecycleCommand<T = unknown> {
  execute(...args: unknown[]): Promise<T>;
}

export type AppLifecycleCommandParams = {
  queries: IAppQueries;
  eventDispatcher: EventDispatcher;
  appDataService: AppDataService;
  executeOtherCommand: IAppLifecycleCommand['execute'];
};
