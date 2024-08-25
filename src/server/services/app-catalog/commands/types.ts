import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import type { IAppDataService } from '@runtipi/shared/node';
import type { IAppCatalogCache } from '../app-catalog-cache';

export interface IAppCatalogCommand<T = unknown> {
  execute(...args: unknown[]): Promise<T>;
}

export type AppCatalogCommandParams = {
  queries: IAppQueries;
  appDataService: IAppDataService;
  appCatalogCache: IAppCatalogCache;
};
