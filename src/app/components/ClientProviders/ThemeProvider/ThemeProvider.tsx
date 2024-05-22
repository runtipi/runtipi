'use client';

import { useUIStore } from '@/client/state/uiStore';
import React, { useEffect } from 'react';
import { useCookies } from 'next-client-cookies';
import { getAutoTheme } from '@/lib/themes';
import { useClientSettings } from '@/hooks/use-client-settings';

type Props = {
  children: React.ReactNode;
  initialTheme?: string;
};

const loadChristmasTheme = async () => {
  const { default: LetItGo } = await import('let-it-go');
  const snow = new LetItGo({ number: 50 });
  snow.letItGoAgain();
};

export const ThemeProvider = (props: Props) => {
  const { children, initialTheme } = props;
  const cookies = useCookies();
  const { theme, setDarkMode } = useUIStore();
  const { allowAutoThemes = false } = useClientSettings();

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

  useEffect(() => {
    const autoTheme = getAutoTheme();
    if (autoTheme === 'christmas' && allowAutoThemes && typeof window !== 'undefined') {
      void loadChristmasTheme();
    }
  }, [allowAutoThemes]);

  return children;
};
