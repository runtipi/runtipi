import type { MyAppsDto } from '@/api-client';

type InstalledApp = MyAppsDto['installed'][number];

export type AppUrl = {
  type: 'domain' | 'local_domain' | 'local';
  label: string;
  url: string;
  secure: boolean;
};

/**
 * List the urls an installed app can be opened with, preferred one first.
 * Mirrors the "Open" menu of the app details page.
 */
export const getAppUrls = ({ app, info, metadata }: InstalledApp, options: { hostname: string; localDomain: string; sslPort: number }) => {
  const { hostname, localDomain, sslPort } = options;
  const suffix = info.url_suffix || '';
  const portSuffix = sslPort !== 443 ? `:${sslPort}` : '';
  const urls: AppUrl[] = [];

  if (info.no_gui) return urls;

  if (app.exposed && app.domain) {
    urls.push({ type: 'domain', label: `${app.domain}${portSuffix}`, url: `https://${app.domain}${portSuffix}${suffix}`, secure: true });
  }

  if (app.exposedLocal && metadata.localSubdomain) {
    const host = `${metadata.localSubdomain}.${localDomain}${portSuffix}`;
    urls.push({ type: 'local_domain', label: host, url: `https://${host}${suffix}`, secure: true });
  }

  if (app.openPort || !info.dynamic_config) {
    const port = app.port ?? info.port;
    const protocol = info.https ? 'https' : 'http';
    urls.push({ type: 'local', label: `${hostname}:${port}`, url: `${protocol}://${hostname}:${port}${suffix}`, secure: false });
  }

  return urls;
};

export const isUpdateAvailable = ({ app, metadata }: InstalledApp) => {
  const versionIsIgnored = app.ignoredVersion === metadata.latestVersion;
  return Number(app.version) < Number(metadata.latestVersion || 0) && !versionIsIgnored && app.status !== 'updating';
};
