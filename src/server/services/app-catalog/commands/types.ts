import { AppQueries } from '@/server/queries/apps/apps.queries';

export interface ICommand<T = unknown> {
  execute(): Promise<T>;
}

export type AppCatalogCommandParams = {
  queries: AppQueries;
  appId?: string;
};
