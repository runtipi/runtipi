'use client';

import { useUIStore } from '@/client/state/uiStore';
import React, { useEffect } from 'react';
import { useCookies } from 'next-client-cookies';

type Props = {
  children: React.ReactNode;
  initialTheme?: string;
};

export const ThemeProvider = (props: Props) => {
  const { children, initialTheme } = props;
  const cookies = useCookies();
  const { theme, setDarkMode } = useUIStore();

  useEffect(() => {
    if (theme) {
      cookies.set('theme', theme || initialTheme || 'light', { path: '/', expires: 365 });
      document.body.dataset.bsTheme = theme;
    } else if (!cookies.get('theme')) {
      // Detect system theme
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setDarkMode(systemTheme === 'dark');
      cookies.set('theme', systemTheme, { path: '/', expires: 365 });
      document.body.dataset.bsTheme = systemTheme;
    }

    const cookieTheme = cookies.get('theme');
    setDarkMode(cookieTheme === 'dark');
  }, [cookies, initialTheme, setDarkMode, theme]);

  return children;
};
