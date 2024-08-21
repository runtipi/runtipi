import type { AppCategory, AppInfo } from '@runtipi/shared';
import {
  IconBook,
  IconBrain,
  IconBroadcast,
  IconCamera,
  IconCode,
  IconDatabase,
  IconDeviceGamepad2,
  IconMovie,
  IconMusic,
  IconPigMoney,
  IconRobot,
  IconShieldLock,
  IconStar,
  IconTool,
  IconUsers,
  IconGridDots
} from '@tabler/icons-react';
import type { AppTableData } from './table.types';

type SortParams = {
  data: AppTableData;
  col: keyof Pick<AppInfo, 'id'>;
  direction: 'asc' | 'desc';
  category?: AppCategory;
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

    return direction === 'asc' ? 1 : -1;
  });

  if (category) {
    return sortedData
      .filter((app) => app.categories.some((c) => c === category))
      .filter((app) => app.name.toLowerCase().includes(search.toLowerCase()) && !app.deprecated);
  }
  return sortedData.filter((app) => app.name.toLowerCase().includes(search.toLowerCase()) && !app.deprecated);
};

export const colorSchemeForCategory: Record<AppCategory, string> = {
  network: 'blue',
  media: 'azure',
  automation: 'indigo',
  development: 'red',
  utilities: 'muted',
  photography: 'purple',
  security: 'orange',
  social: 'yellow',
  featured: 'lime',
  data: 'green',
  books: 'teal',
  music: 'cyan',
  finance: 'dark',
  gaming: 'pink',
  ai: 'muted',
};

type AppCategoryEntry = {
  id: AppCategory | 'all';
  icon: typeof IconBook;
};

export const iconForCategory: AppCategoryEntry[] = [
  { id: 'all', icon: IconGridDots},
  { id: 'network', icon: IconBroadcast },
  { id: 'media', icon: IconMovie },
  { id: 'development', icon: IconCode },
  { id: 'automation', icon: IconRobot },
  { id: 'social', icon: IconUsers },
  { id: 'utilities', icon: IconTool },
  { id: 'photography', icon: IconCamera },
  { id: 'security', icon: IconShieldLock },
  { id: 'featured', icon: IconStar },
  { id: 'books', icon: IconBook },
  { id: 'data', icon: IconDatabase },
  { id: 'music', icon: IconMusic },
  { id: 'finance', icon: IconPigMoney },
  { id: 'gaming', icon: IconDeviceGamepad2 },
  { id: 'ai', icon: IconBrain },
];
