import { AppConfig } from '@runtipi/common';

export type SortableColumns = keyof Pick<AppConfig, 'name'>;
export type SortDirection = 'asc' | 'desc';
