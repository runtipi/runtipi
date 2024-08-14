import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import type { AppDataService } from '@runtipi/shared/node';
import type { AppCatalogCache } from '../app-catalog-cache';

export interface IAppCatalogCommand<T = unknown> {
  execute(...args: unknown[]): Promise<T>;
}

export type AppCatalogCommandParams = {
  queries: IAppQueries;
  appDataService: AppDataService;
  appCatalogCache: AppCatalogCache;
};
