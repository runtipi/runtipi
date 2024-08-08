import type { EventDispatcher } from '@/server/core/EventDispatcher';
import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import type { AppDataService } from '@runtipi/shared/node';

export interface IAppBackupCommand<T = unknown> {
  execute(...args: unknown[]): Promise<T>;
}

export type AppBackupCommandParams = {
  queries: IAppQueries;
  eventDispatcher: EventDispatcher;
  appDataService: AppDataService;
  executeOtherCommand: IAppBackupCommand['execute'];
};
