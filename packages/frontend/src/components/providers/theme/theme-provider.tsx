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
  const primaryColor = useUIStore((state) => state.primaryColor);
  const themeBase = useUIStore((state) => state.themeBase);
  const setThemeBase = useUIStore((state) => state.setThemeBase);
  const setPrimaryColor = useUIStore((state) => state.setPrimaryColor);
  const setDarkMode = useUIStore((state) => state.setDarkMode);

  useEffect(() => {
    if (themeBase) {
      Cookies.set('themeBase', themeBase, { path: '/', expires: 365 });
      document.body.dataset.bsThemeBase = themeBase;
    }

    if (primaryColor) {
      Cookies.set('primaryColor', primaryColor, { path: '/', expires: 365 });
      document.body.dataset.bsThemePrimary = primaryColor;
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
    const cookiePrimaryColor = Cookies.get('primaryColor');
    setPrimaryColor(cookiePrimaryColor || 'blue');
  }, [initialTheme, setDarkMode, theme, themeBase, primaryColor, setThemeBase, setPrimaryColor]);

  return children;
};
