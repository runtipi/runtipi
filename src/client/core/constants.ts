import { AppCategory } from './types';

type AppCategoryEntry = {
  name: string;
  id: AppCategory;
  icon: string;
};

export const APP_CATEGORIES: AppCategoryEntry[] = [
  { name: 'Network', id: 'network', icon: 'FaNetworkWired' },
  { name: 'Media', id: 'media', icon: 'FaVideo' },
  { name: 'Development', id: 'development', icon: 'FaCode' },
  { name: 'Automation', id: 'automation', icon: 'FaRobot' },
  { name: 'Social', id: 'social', icon: 'FaUserFriends' },
  { name: 'Utilities', id: 'utilities', icon: 'FaWrench' },
  { name: 'Photography', id: 'photography', icon: 'FaCamera' },
  { name: 'Security', id: 'security', icon: 'FaShieldAlt' },
  { name: 'Featured', id: 'featured', icon: 'FaStar' },
  { name: 'Books', id: 'books', icon: 'FaBook' },
  { name: 'Data', id: 'data', icon: 'FaDatabase' },
  { name: 'Music', id: 'music', icon: 'FaMusic' },
  { name: 'Finance', id: 'finance', icon: 'FaMoneyBillAlt' },
  { name: 'Gaming', id: 'gaming', icon: 'FaGamepad' },
];
