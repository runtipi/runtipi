import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Cookies from 'js-cookie';

type Store = Record<string, string>;

const createLocalStorageMock = () => {
  let backing: Store = {};
  return {
    getItem: (key: string) => (key in backing ? backing[key]! : null),
    setItem: (key: string, value: string) => {
      backing[key] = String(value);
    },
    removeItem: (key: string) => {
      delete backing[key];
    },
    clear: () => {
      backing = {};
    },
    reset: () => {
      backing = {};
    },
  };
};

const localStorageMock = createLocalStorageMock();

const stubWindow = (options: { localStorageEnabled?: boolean } = {}) => {
  vi.stubGlobal('window', {
    matchMedia: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    localStorage: options.localStorageEnabled === false ? undefined : localStorageMock,
  });
};

const importModule = async () => {
  vi.resetModules();
  return import('./theme-mode-storage');
};

describe('theme-mode-storage', () => {
  beforeEach(() => {
    localStorageMock.reset();
    // js-cookie returns undefined (not {}) when document is unavailable; guard the cleanup
    const existing = Cookies.get();
    if (existing) {
      Object.keys(existing).forEach((name) => Cookies.remove(name));
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saveThemeMode persists the mode and loadThemeMode reads it back', async () => {
    stubWindow();
    const { saveThemeMode, loadThemeMode } = await importModule();

    saveThemeMode('system');
    expect(localStorageMock.getItem('themeMode')).toBe('system');
    expect(loadThemeMode()).toBe('system');

    saveThemeMode('dark');
    expect(loadThemeMode()).toBe('dark');
  });

  it('saveThemeMode fails silently when localStorage is unavailable', async () => {
    stubWindow({ localStorageEnabled: false });
    const { saveThemeMode } = await importModule();

    expect(() => saveThemeMode('dark')).not.toThrow();
  });

  it('loadThemeMode returns null for invalid stored values', async () => {
    stubWindow();
    const { loadThemeMode } = await importModule();

    localStorageMock.setItem('themeMode', 'blue');
    expect(loadThemeMode()).toBeNull();

    localStorageMock.setItem('themeMode', 'not-a-mode');
    expect(loadThemeMode()).toBeNull();
  });

  it('resolveStoredThemeMode returns the persisted mode when present', async () => {
    stubWindow();
    Cookies.set('theme', 'light'); // stale legacy cookie must be ignored
    const { resolveStoredThemeMode } = await importModule();

    localStorageMock.setItem('themeMode', 'system');
    expect(resolveStoredThemeMode()).toBe('system');
  });

  it('resolveStoredThemeMode migrates the legacy theme cookie', async () => {
    stubWindow();
    const { resolveStoredThemeMode } = await importModule();

    // js-cookie needs a real document; stub the cookie read instead.
    const getSpy = vi.spyOn(Cookies, 'get').mockImplementation(((name?: string) => {
      if (name === 'theme') return 'dark';
      return {} as Record<string, string>;
    }) as typeof Cookies.get);
    expect(resolveStoredThemeMode()).toBe('dark');

    getSpy.mockImplementation(((name?: string) => {
      if (name === 'theme') return 'light';
      return {} as Record<string, string>;
    }) as typeof Cookies.get);
    expect(resolveStoredThemeMode()).toBe('light');

    getSpy.mockRestore();
  });

  it('resolveStoredThemeMode falls back to system when nothing is stored', async () => {
    stubWindow();
    const { resolveStoredThemeMode } = await importModule();

    expect(resolveStoredThemeMode()).toBe('system');
  });
});
