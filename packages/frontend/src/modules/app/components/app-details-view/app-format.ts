import { toSupportedLocale } from '@/lib/i18n/locales';
import type { AppDetails, AppInfo, AppMetadata } from '@/types/app.types';
import i18next from 'i18next';

/**
 * Short date and time, e.g. "28 Sep 2026, 1:42 AM", in the instance time zone.
 */
export const formatShortDate = (date: Date | string | number, timeZone?: string) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '';

  try {
    return value.toLocaleString(toSupportedLocale(i18next.language), { dateStyle: 'medium', timeStyle: 'short', timeZone });
  } catch {
    return value.toLocaleString();
  }
};

/**
 * Address an installed app is best opened with: its domain, then its local domain, then its port.
 */
export const getPreferredAddress = (
  info: AppInfo,
  app: AppDetails | null | undefined,
  metadata: AppMetadata,
  { localDomain, sslPort }: { localDomain: string; sslPort: number },
): { label: string; url: string } | undefined => {
  if (info.no_gui || !app) return undefined;

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const portSuffix = sslPort !== 443 ? `:${sslPort}` : '';
  const suffix = info.url_suffix || '';
  const port = app.port ?? info.port;

  if (app.exposed && app.domain) {
    return { label: `${app.domain}${portSuffix}`, url: `https://${app.domain}${portSuffix}${suffix}` };
  }
  if (app.exposedLocal && metadata.localSubdomain) {
    const host = `${metadata.localSubdomain}.${localDomain}${portSuffix}`;
    return { label: host, url: `https://${host}${suffix}` };
  }
  if ((app.openPort || !info.dynamic_config) && port) {
    return { label: `${hostname}:${port}`, url: `${info.https ? 'https' : 'http'}://${hostname}:${port}${suffix}` };
  }
  return undefined;
};
