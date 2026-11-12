import Cookies from 'js-cookie';
import type { ThemeMode } from '@/stores/ui-store';

export const THEME_MODE_STORAGE_KEY = 'themeMode';

const isValidThemeMode = (value: unknown): value is ThemeMode => value === 'system' || value === 'light' || value === 'dark';

/**
 * Persist the selected theme mode so it survives reloads.
 * Fails silently when localStorage is unavailable (e.g. storage disabled).
 */
export const saveThemeMode = (mode: ThemeMode): void => {
  try {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  } catch {
    // localStorage unavailable — the mode won't survive reloads
  }
};

/**
 * Read the persisted theme mode, or null when nothing (valid) is stored.
 */
export const loadThemeMode = (): ThemeMode | null => {
  try {
    const stored = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
    if (isValidThemeMode(stored)) {
      return stored;
    }
  } catch {
    // localStorage unavailable — fall through to the cookie migration
  }

  return null;
};

/**
 * Resolve the theme mode to boot with:
 * 1. the persisted mode (localStorage),
 * 2. the legacy `theme` cookie, for users who picked light/dark before
 *    theme modes existed — their choice is migrated to the matching mode,
 * 3. otherwise follow the system.
 */
export const resolveStoredThemeMode = (): ThemeMode => {
  return (
    loadThemeMode() ??
    ((): ThemeMode => {
      const cookieTheme = Cookies.get('theme');
      if (cookieTheme === 'dark' || cookieTheme === 'light') {
        return cookieTheme;
      }
      return 'system';
    })()
  );
};
