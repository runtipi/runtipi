import { AppCategoriesEnum } from '../types';

// Icons should come from FontAwesome https://react-icons.github.io/react-icons/icons?name=fa
export const APP_CATEGORIES = [
  { name: 'Network', id: AppCategoriesEnum.NETWORK, icon: 'FaNetworkWired' },
  { name: 'Media', id: AppCategoriesEnum.MEDIA, icon: 'FaVideo' },
  { name: 'Development', id: AppCategoriesEnum.DEVELOPMENT, icon: 'FaCode' },
  { name: 'Automation', id: AppCategoriesEnum.AUTOMATION, icon: 'FaRobot' },
  { name: 'Social', id: AppCategoriesEnum.SOCIAL, icon: 'FaUserFriends' },
  { name: 'Utilities', id: AppCategoriesEnum.UTILITIES, icon: 'FaWrench' },
  { name: 'Photography', id: AppCategoriesEnum.PHOTOGRAPHY, icon: 'FaCamera' },
  { name: 'Security', id: AppCategoriesEnum.SECURITY, icon: 'FaShieldAlt' },
  { name: 'Featured', id: AppCategoriesEnum.FEATURED, icon: 'FaStar' },
  { name: 'Books', id: AppCategoriesEnum.BOOKS, icon: 'FaBook' },
  { name: 'Data', id: AppCategoriesEnum.DATA, icon: 'FaDatabase' },
];
