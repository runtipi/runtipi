import { AppConfig } from '../../../generated/graphql';

export type SortableColumns = keyof Pick<AppConfig, 'name'>;
export type SortDirection = 'asc' | 'desc';

export type AppTableData = Omit<AppConfig, 'description' | 'form_fields' | 'source' | 'status' | 'url_suffix' | 'version'>[];
