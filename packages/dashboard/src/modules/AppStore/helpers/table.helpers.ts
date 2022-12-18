import { AppCategoriesEnum, AppInfo } from '../../../generated/graphql';
import { AppTableData } from './table.types';

type SortParams = {
  data: AppTableData;
  col: keyof Pick<AppInfo, 'name'>;
  direction: 'asc' | 'desc';
  category?: AppCategoriesEnum;
  search: string;
};

export const sortTable = (params: SortParams) => {
  const { data, col, direction, category, search } = params;

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[col];
    const bVal = b[col];
    if (aVal < bVal) {
      return direction === 'asc' ? -1 : 1;
    }
    if (aVal > bVal) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  if (category) {
    return sortedData.filter((app) => app.categories.some((c) => c === category)).filter((app) => app.name.toLowerCase().includes(search.toLowerCase()));
  }
  return sortedData.filter((app) => app.name.toLowerCase().includes(search.toLowerCase()));
};

export const limitText = (text: string, limit: number) => (text.length > limit ? `${text.substring(0, limit)}...` : text);

export const colorSchemeForCategory: Record<AppCategoriesEnum, string> = {
  [AppCategoriesEnum.Network]: 'blue',
  [AppCategoriesEnum.Media]: 'azure',
  [AppCategoriesEnum.Automation]: 'indigo',
  [AppCategoriesEnum.Development]: 'red',
  [AppCategoriesEnum.Utilities]: 'muted',
  [AppCategoriesEnum.Photography]: 'purple',
  [AppCategoriesEnum.Security]: 'organge',
  [AppCategoriesEnum.Social]: 'yellow',
  [AppCategoriesEnum.Featured]: 'lime',
  [AppCategoriesEnum.Data]: 'green',
  [AppCategoriesEnum.Books]: 'teal',
  [AppCategoriesEnum.Music]: 'cyan',
  [AppCategoriesEnum.Finance]: 'dark',
  [AppCategoriesEnum.Gaming]: 'pink',
};
