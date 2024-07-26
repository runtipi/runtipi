import { AppQueries } from '@/server/queries/apps/apps.queries';
import { AppDataService } from '@runtipi/shared/node';
import { AppCatalogCache } from '../app-catalog-cache';

export interface IAppCatalogCommand<T = unknown> {
  execute(...args: unknown[]): Promise<T>;
}

export type AppCatalogCommandParams = {
  queries: AppQueries;
  appDataService: AppDataService;
  appCatalogCache: AppCatalogCache;
};
