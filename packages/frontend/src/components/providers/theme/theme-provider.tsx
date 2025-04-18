import { useUIStore } from '@/stores/ui-store';
import Cookies from 'js-cookie';
import type React from 'react';

type Props = {
  children: React.ReactNode;
};

export const ThemeProvider = (props: Props) => {
  const { children } = props;

  const setDarkMode = useUIStore((state) => state.setDarkMode);

  const cookieTheme = Cookies.get('theme');

  if (cookieTheme) {
    setDarkMode(cookieTheme === 'dark');
  } else {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setDarkMode(systemTheme === 'dark');
  }

  return children;
};
