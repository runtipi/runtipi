import { useUserContext } from '@/context/user-context';
import { resolveStoredThemeMode, saveThemeMode } from '@/lib/theme/theme-mode-storage';
import { useUIStore } from '@/stores/ui-store';
import Cookies from 'js-cookie';
import type React from 'react';
import { useEffect, useLayoutEffect } from 'react';

const THEME_COOKIE_OPTIONS = { path: '/', expires: 365 } as const;

type Props = {
  children: React.ReactNode;
  initialTheme?: string;
};

export const getSystemDarkPreference = () => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const ThemeProvider = (props: Props) => {
  const { children, initialTheme } = props;
  const theme = useUIStore((state) => state.theme);
  const themeMode = useUIStore((state) => state.themeMode);
  const setResolvedSystemTheme = useUIStore((state) => state.setResolvedSystemTheme);
  const { themeBase, themeColor } = useUserContext();

  // Boot: hydrate the mode from storage before first paint.
  useLayoutEffect(() => {
    const storedMode = resolveStoredThemeMode();
    const { themeMode: currentMode, setThemeMode } = useUIStore.getState();
    if (storedMode !== currentMode) {
      setThemeMode(storedMode);
    }
  }, []);

  // Persist the mode whenever it changes (including the boot hydration above),
  // so the selected mode survives reloads instead of degrading to the resolved theme.
  useEffect(() => {
    saveThemeMode(themeMode);
  }, [themeMode]);

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
      // Read the mode from the store: this callback outlives the render that
      // created it, so the captured `themeMode` may be stale.
      if (useUIStore.getState().themeMode !== 'system') {
        return;
      }
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
