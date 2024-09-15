import type { IEventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';
import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import type { IAppDataService, IBackupManager } from '@runtipi/shared/node';

export interface IAppBackupCommand<T = unknown> {
  execute(...args: unknown[]): Promise<T>;
}

export type AppBackupCommandParams = {
  queries: IAppQueries;
  eventDispatcher: IEventDispatcher;
  appDataService: IAppDataService;
  executeOtherCommand: IAppBackupCommand['execute'];
  backupManager: IBackupManager;
};
