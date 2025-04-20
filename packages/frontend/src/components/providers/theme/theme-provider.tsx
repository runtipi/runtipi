import { useUIStore } from '@/stores/ui-store';
import Cookies from 'js-cookie';
import type React from 'react';
import { useEffect } from 'react';

type Props = {
  children: React.ReactNode;
  initialTheme?: string;
};

export const ThemeProvider = (props: Props) => {
  const { children, initialTheme } = props;

  const theme = useUIStore((state) => state.theme);
  const themeBase = useUIStore((state) => state.themeBase);
  const setThemeBase = useUIStore((state) => state.setThemeBase);
  const setDarkMode = useUIStore((state) => state.setDarkMode);

  useEffect(() => {
    if (themeBase) {
      Cookies.set('themeBase', themeBase, { path: '/', expires: 365 });
      document.body.dataset.bsThemeBase = themeBase;
    } else if (!Cookies.get('themeBase')) {
      setThemeBase('gray');
      Cookies.set('themeBase', 'gray', { path: '/', expires: 365 });
      document.body.dataset.bsThemeBase = 'gray';
    }

    if (theme) {
      Cookies.set('theme', theme || initialTheme || 'light', { path: '/', expires: 365 });
      document.body.dataset.bsTheme = theme;
    } else if (!Cookies.get('theme')) {
      // Detect system theme
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setDarkMode(systemTheme === 'dark');
      Cookies.set('theme', systemTheme, { path: '/', expires: 365 });
      document.body.dataset.bsTheme = systemTheme;
    }

    const cookieTheme = Cookies.get('theme');
    setDarkMode(cookieTheme === 'dark');
    const cookieThemeBase = Cookies.get('themeBase');
    setThemeBase(cookieThemeBase || 'gray');
  }, [initialTheme, setDarkMode, theme, themeBase, setThemeBase]);

  return children;
};
