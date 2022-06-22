import { AppInfo } from '../../../generated/graphql';

export type SortableColumns = keyof Pick<AppInfo, 'name'>;
export type SortDirection = 'asc' | 'desc';

export type AppTableData = Omit<AppInfo, 'description' | 'form_fields' | 'source' | 'status' | 'url_suffix' | 'version'>[];
