import type { ColorMode, ResolvedTheme } from '@/stores/ui-store';
import Cookies from 'js-cookie';

/**
 * The preference lives in its own cookie. The previous "theme" cookie was written on the first visit even when
 * nobody picked a theme, so it can't tell a choice from a default and is ignored: everyone starts on "system".
 */
export const COLOR_MODE_COOKIE = 'color-mode';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export const readColorMode = (): ColorMode => {
  const value = Cookies.get(COLOR_MODE_COOKIE);
  return value === 'light' || value === 'dark' ? value : 'system';
};

export const saveColorMode = (mode: ColorMode) => {
  Cookies.set(COLOR_MODE_COOKIE, mode, { path: '/', expires: 365, sameSite: 'lax' });
};

export const systemTheme = (): ResolvedTheme => (window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light');

export const resolveColorMode = (mode: ColorMode): ResolvedTheme => (mode === 'system' ? systemTheme() : mode);

/** Calls back when the device switches between light and dark */
export const onSystemThemeChange = (callback: (theme: ResolvedTheme) => void) => {
  const query = window.matchMedia?.(DARK_QUERY);
  if (!query) return () => undefined;
  const listener = () => callback(query.matches ? 'dark' : 'light');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
};

/**
 * Inline script run before the first paint, so pages don't flash light before switching to dark.
 * Mirrors readColorMode and resolveColorMode.
 */
export const colorModeBootScript = `(function(){try{var m=document.cookie.match(/(?:^|; )${COLOR_MODE_COOKIE}=(light|dark)/);var t=m?m[1]:(window.matchMedia&&window.matchMedia('${DARK_QUERY}').matches?'dark':'light');document.body.dataset.bsTheme=t;}catch(e){}})();`;
