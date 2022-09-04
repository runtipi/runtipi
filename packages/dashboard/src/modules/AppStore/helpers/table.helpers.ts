import { AppCategoriesEnum, AppInfo } from '../../../generated/graphql';
import { AppTableData } from './table.types';

export const sortTable = (data: AppTableData, col: keyof Pick<AppInfo, 'name'>, direction: 'asc' | 'desc', categories: AppCategoriesEnum[], search: string) => {
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

  if (categories.length > 0) {
    return sortedData.filter((app) => app.categories.some((c) => categories.includes(c))).filter((app) => app.name.toLowerCase().includes(search.toLowerCase()));
  } else {
    return sortedData.filter((app) => app.name.toLowerCase().includes(search.toLowerCase()));
  }
};

export const limitText = (text: string, limit: number) => {
  return text.length > limit ? `${text.substring(0, limit)}...` : text;
};

export const colorSchemeForCategory: Record<AppCategoriesEnum, string> = {
  [AppCategoriesEnum.Network]: 'blue',
  [AppCategoriesEnum.Media]: 'green',
  [AppCategoriesEnum.Automation]: 'orange',
  [AppCategoriesEnum.Development]: 'purple',
  [AppCategoriesEnum.Utilities]: 'gray',
  [AppCategoriesEnum.Photography]: 'red',
  [AppCategoriesEnum.Security]: 'yellow',
  [AppCategoriesEnum.Social]: 'teal',
  [AppCategoriesEnum.Featured]: 'pink',
  [AppCategoriesEnum.Data]: 'red',
  [AppCategoriesEnum.Books]: 'blue',
  [AppCategoriesEnum.Music]: 'green',
  [AppCategoriesEnum.Finance]: 'orange',
  [AppCategoriesEnum.Gaming]: 'purple',
};
