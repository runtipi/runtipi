import { EventDispatcher } from '@/server/core/EventDispatcher';
import { AppQueries } from '@/server/queries/apps/apps.queries';

export interface IAppLifecycleCommand<T = unknown> {
  execute(...args: unknown[]): Promise<T>;
}

export type AppLifecycleCommandParams = {
  queries: AppQueries;
  eventDispatcher: EventDispatcher;
};
