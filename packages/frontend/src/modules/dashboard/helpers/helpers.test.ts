import type { MyAppsDto } from '@/api-client';
import { describe, expect, it } from 'vitest';
import { getAppUrls, isUpdateAvailable } from './app-urls';
import { formatBytes, formatPercent, formatTime, formatUptime, getSeverity } from './format';

type InstalledApp = MyAppsDto['installed'][number];

const createApp = (overrides: { app?: Partial<InstalledApp['app']>; info?: Partial<InstalledApp['info']> } = {}) =>
  ({
    app: {
      status: 'running',
      version: 1,
      ignoredVersion: null,
      exposed: false,
      exposedLocal: false,
      openPort: true,
      port: null,
      domain: null,
      ...overrides.app,
    },
    info: { urn: 'whoami:migrated', port: 8382, https: false, no_gui: false, dynamic_config: true, url_suffix: '', ...overrides.info },
    metadata: { latestVersion: 1, localSubdomain: 'whoami' },
  }) as unknown as InstalledApp;

const options = { hostname: '192.168.1.10', localDomain: 'tipi.lan', sslPort: 443 };

describe('format helpers', () => {
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(8 * 1024 ** 3)).toBe('8 GB');
  });

  it('formats percents and uptime', () => {
    expect(formatPercent(22.0149)).toBe('22%');
    expect(formatPercent(7.46)).toBe('7.5%');
    expect(formatUptime(90061)).toBe('1d 1h');
    expect(formatUptime(3720)).toBe('1h 2m');
    expect(formatUptime(59)).toBe('0m');
  });

  it('does not throw on invalid locales', () => {
    expect(() => formatTime(0, 'en-US@posix')).not.toThrow();
  });

  it('computes severity', () => {
    expect(getSeverity(50)).toBe('ok');
    expect(getSeverity(80)).toBe('warning');
    expect(getSeverity(95)).toBe('danger');
  });
});

describe('getAppUrls', () => {
  it('orders domain, local domain and port', () => {
    const urls = getAppUrls(
      createApp({
        app: { exposed: true, domain: 'whoami.example.com', exposedLocal: true, openPort: true, port: 9000 },
        info: { url_suffix: '/ui' },
      }),
      options,
    );

    expect(urls.map((url) => url.url)).toEqual(['https://whoami.example.com/ui', 'https://whoami.tipi.lan/ui', 'http://192.168.1.10:9000/ui']);
  });

  it('adds the ssl port when it is not 443', () => {
    const [url] = getAppUrls(createApp({ app: { exposedLocal: true, openPort: false } }), { ...options, sslPort: 8443 });

    expect(url?.url).toBe('https://whoami.tipi.lan:8443');
  });

  it('returns nothing for apps without a gui', () => {
    expect(getAppUrls(createApp({ info: { no_gui: true } }), options)).toEqual([]);
  });
});

describe('isUpdateAvailable', () => {
  it('detects updates and respects ignored versions', () => {
    const app = createApp({ app: { version: 1 } });
    app.metadata.latestVersion = 2;
    expect(isUpdateAvailable(app)).toBe(true);

    app.app.ignoredVersion = 2;
    expect(isUpdateAvailable(app)).toBe(false);
  });
});
