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
import { AppCategory } from '@runtipi/shared';

type AppCategoryEntry = {
  id: AppCategory;
  icon: Icon;
};

export const APP_CATEGORIES: AppCategoryEntry[] = [
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
