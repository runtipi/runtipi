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
  const { theme } = useUIStore();

  useEffect(() => {
    if (theme) {
      cookies.set('theme', theme || initialTheme || 'light', { path: '/' });
      document.body.dataset.bsTheme = theme;
    }
  }, [cookies, initialTheme, theme]);

  return children;
};
