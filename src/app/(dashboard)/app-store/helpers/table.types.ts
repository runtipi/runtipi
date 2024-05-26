import { AppInfo } from '@runtipi/shared';

export type SortableColumns = keyof Pick<AppInfo, 'id'>;

export type AppTableData = Omit<AppInfo, 'description' | 'form_fields' | 'source' | 'status' | 'url_suffix' | 'version'>[];
