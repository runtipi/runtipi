import {
  Icon,
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
import { AppCategory } from './types';

type AppCategoryEntry = {
  name: string;
  id: AppCategory;
  icon: Icon;
};

export const APP_CATEGORIES: AppCategoryEntry[] = [
  { name: 'Network', id: 'network', icon: IconBroadcast },
  { name: 'Media', id: 'media', icon: IconMovie },
  { name: 'Development', id: 'development', icon: IconCode },
  { name: 'Automation', id: 'automation', icon: IconRobot },
  { name: 'Social', id: 'social', icon: IconUsers },
  { name: 'Utilities', id: 'utilities', icon: IconTool },
  { name: 'Photography', id: 'photography', icon: IconCamera },
  { name: 'Security', id: 'security', icon: IconShieldLock },
  { name: 'Featured', id: 'featured', icon: IconStar },
  { name: 'Books', id: 'books', icon: IconBook },
  { name: 'Data', id: 'data', icon: IconDatabase },
  { name: 'Music', id: 'music', icon: IconMusic },
  { name: 'Finance', id: 'finance', icon: IconPigMoney },
  { name: 'Gaming', id: 'gaming', icon: IconDeviceGamepad2 },
  { name: 'AI', id: 'ai', icon: IconBrain },
];
