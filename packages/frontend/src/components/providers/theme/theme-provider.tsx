import { useUserContext } from '@/context/user-context';
import type { ThemeMode } from '@/stores/ui-store';
import { useUIStore } from '@/stores/ui-store';
import Cookies from 'js-cookie';
import type React from 'react';
import { useEffect, useLayoutEffect } from 'react';

const THEME_COOKIE_OPTIONS = { path: '/', expires: 365 } as const;
const THEME_MODE_STORAGE_KEY = 'themeMode';

type Props = {
  children: React.ReactNode;
  initialTheme?: string;
};

export const getSystemDarkPreference = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const getStoredThemeMode = (): ThemeMode => {
  try {
    const stored = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
    if (stored === 'system' || stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // localStorage unavailable (e.g. storage disabled) — fall back to the cookie
  }

  // Migration: users who picked light/dark before themeMode existed have a
  // `theme` cookie. Map it to the matching explicit mode so their choice
  // survives the upgrade. No cookie at all → follow the system.
  const cookieTheme = Cookies.get('theme');
  if (cookieTheme === 'dark' || cookieTheme === 'light') {
    return cookieTheme;
  }
  return 'system';
};

export const ThemeProvider = (props: Props) => {
  const { children, initialTheme } = props;
  const theme = useUIStore((state) => state.theme);
  const themeMode = useUIStore((state) => state.themeMode);
  const setResolvedSystemTheme = useUIStore((state) => state.setResolvedSystemTheme);
  const { themeBase, themeColor } = useUserContext();

  // Boot: hydrate the mode from localStorage before first paint.
  useLayoutEffect(() => {
    const storedMode = getStoredThemeMode();
    const { themeMode: currentMode, setThemeMode } = useUIStore.getState();
    if (storedMode !== currentMode) {
      setThemeMode(storedMode);
    }
  }, []);

  // Keep base/primary theme datasets in sync with instance settings.
  useEffect(() => {
    if (themeBase) {
      document.body.dataset.bsThemeBase = themeBase;
    }
    if (themeColor) {
      document.body.dataset.bsThemePrimary = themeColor;
    }
  }, [themeBase, themeColor]);

  // System mode: resolve now and live-switch when the OS preference changes.
  useEffect(() => {
    if (themeMode !== 'system') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = (event: MediaQueryListEvent) => {
      setResolvedSystemTheme(event.matches);
    };

    setResolvedSystemTheme(getSystemDarkPreference());
    mediaQuery.addEventListener('change', onSystemChange);
    return () => mediaQuery.removeEventListener('change', onSystemChange);
  }, [themeMode, setResolvedSystemTheme]);

  // Apply the effective theme to the DOM and the cookie.
  useEffect(() => {
    const effectiveTheme = theme ?? initialTheme ?? (getSystemDarkPreference() ? 'dark' : 'light');
    Cookies.set('theme', effectiveTheme, THEME_COOKIE_OPTIONS);
    document.body.dataset.bsTheme = effectiveTheme;
  }, [theme, initialTheme]);

  return children;
};
