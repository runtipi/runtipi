import { AppInfo } from '../../../core/types';

export type SortableColumns = keyof Pick<AppInfo, 'id'>;
export type SortDirection = 'asc' | 'desc';

export type AppTableData = Omit<AppInfo, 'description' | 'form_fields' | 'source' | 'status' | 'url_suffix' | 'version'>[];
