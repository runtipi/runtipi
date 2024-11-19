import type { AppCategory } from '@/types/app.types';
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
} from '@tabler/icons-react';

export const colorSchemeForCategory: Record<string, string> = {
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
  id: AppCategory;
  icon: typeof IconBook;
};

export const iconForCategory: AppCategoryEntry[] = [
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
