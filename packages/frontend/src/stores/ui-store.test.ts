import { beforeEach, describe, expect, it } from 'vitest';
import { getNextThemeMode, useUIStore } from './ui-store';

describe('ui-store theme mode', () => {
  beforeEach(() => {
    useUIStore.setState({ darkMode: false, theme: undefined, themeMode: 'system', activeRoute: undefined });
  });

  it('defaults to system mode', () => {
    expect(useUIStore.getState().themeMode).toBe('system');
  });

  it('setThemeMode("dark") sets explicit dark theme', () => {
    useUIStore.getState().setThemeMode('dark');
    expect(useUIStore.getState().themeMode).toBe('dark');
    expect(useUIStore.getState().theme).toBe('dark');
    expect(useUIStore.getState().darkMode).toBe(true);
  });

  it('setThemeMode("light") sets explicit light theme', () => {
    useUIStore.getState().setThemeMode('light');
    expect(useUIStore.getState().themeMode).toBe('light');
    expect(useUIStore.getState().theme).toBe('light');
    expect(useUIStore.getState().darkMode).toBe(false);
  });

  it('setThemeMode("system") only marks the mode; resolution is the provider\'s job', () => {
    useUIStore.getState().setThemeMode('dark');
    useUIStore.getState().setThemeMode('system');
    expect(useUIStore.getState().themeMode).toBe('system');
    // theme/darkMode untouched until ThemeProvider resolves the system preference
    expect(useUIStore.getState().theme).toBe('dark');
    expect(useUIStore.getState().darkMode).toBe(true);
  });

  it('setResolvedSystemTheme updates theme and darkMode without leaving system mode', () => {
    useUIStore.getState().setResolvedSystemTheme(true);
    expect(useUIStore.getState().theme).toBe('dark');
    expect(useUIStore.getState().darkMode).toBe(true);
    expect(useUIStore.getState().themeMode).toBe('system');

    useUIStore.getState().setResolvedSystemTheme(false);
    expect(useUIStore.getState().theme).toBe('light');
    expect(useUIStore.getState().darkMode).toBe(false);
    expect(useUIStore.getState().themeMode).toBe('system');
  });

  it('cycles light → dark → system → light', () => {
    expect(getNextThemeMode('light')).toBe('dark');
    expect(getNextThemeMode('dark')).toBe('system');
    expect(getNextThemeMode('system')).toBe('light');
  });
});
