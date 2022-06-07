import { AppCategoriesEnum, AppConfig } from '@runtipi/common';

export const sortTable = (data: AppConfig[], col: keyof Pick<AppConfig, 'name'>, direction: 'asc' | 'desc', categories: AppCategoriesEnum[], search: string) => {
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
  return text.length > limit ? `${text.substr(0, limit)}...` : text;
};

export const colorSchemeForCategory: Record<AppCategoriesEnum, string> = {
  [AppCategoriesEnum.NETWORK]: 'blue',
  [AppCategoriesEnum.MEDIA]: 'green',
  [AppCategoriesEnum.AUTOMATION]: 'orange',
  [AppCategoriesEnum.DEVELOPMENT]: 'purple',
  [AppCategoriesEnum.UTILITIES]: 'gray',
  [AppCategoriesEnum.PHOTOGRAPHY]: 'red',
  [AppCategoriesEnum.SECURITY]: 'yellow',
  [AppCategoriesEnum.SOCIAL]: 'teal',
  [AppCategoriesEnum.FEATURED]: 'pink',
};
