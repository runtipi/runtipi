import type { GuestAppsDto } from '@/api-client';
import { getGuestAppsOptions, getGuestLinksOptions } from '@/api-client/@tanstack/react-query.gen';
import { AppIcon } from '@/components/app-icon/app-icon';
import { RuntipiLogo } from '@/components/layouts/app-shell/runtipi-logo';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { useUserContext } from '@/context/user-context';
import { useUIStore } from '@/stores/ui-store';
import type { CustomLink } from '@/types/app.types';
import {
  IconArrowUpRight,
  IconCertificate,
  IconCode,
  IconHeart,
  IconLock,
  IconLockOff,
  IconLogin2,
  IconMoon,
  IconSearch,
  IconSun,
} from '@tabler/icons-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import './guest-dashboard.css';

type GuestApp = GuestAppsDto['installed'][number];
type GuestUrl = { key: string; label: string; url: string; secure: boolean };

/** Urls a guest can open an app with, preferred one first */
const getGuestUrls = ({ info, app, metadata }: GuestApp, localDomain: string, sslPort: number): GuestUrl[] => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const portSuffix = sslPort !== 443 ? `:${sslPort}` : '';
  const suffix = info.url_suffix || '';
  const urls: GuestUrl[] = [];

  if (app.exposed && app.domain) {
    urls.push({ key: 'domain', label: `${app.domain}${portSuffix}`, url: `https://${app.domain}${portSuffix}${suffix}`, secure: true });
  }
  if (app.exposedLocal || !info.dynamic_config) {
    const host = `${metadata.localSubdomain}.${localDomain}${portSuffix}`;
    urls.push({ key: 'local', label: host, url: `https://${host}${suffix}`, secure: true });
  }
  if (app.openPort || !info.dynamic_config) {
    const port = app.port ?? info.port;
    urls.push({ key: 'port', label: `${hostname}:${port}`, url: `${info.https ? 'https' : 'http'}://${hostname}:${port}${suffix}`, secure: false });
  }

  return urls;
};

const getGroup = (app: GuestApp) => app.info.categories?.find((category) => category !== 'featured') ?? 'other';

type LaunchProps = {
  name: string;
  description?: string | null;
  icon: ReactNode;
  urls: GuestUrl[];
  testId?: string;
};

const LaunchCard = ({ name, description, icon, urls, testId }: LaunchProps) => {
  const { t } = useTranslation();
  const [primary] = urls;

  const body = (
    <>
      <span className="rt-launch__icon">{icon}</span>
      <span className="rt-launch__text">
        <span className="rt-launch__name">{name}</span>
        {description && <span className="rt-launch__desc">{description}</span>}
      </span>
    </>
  );

  return (
    <div className={clsx('rt-launch', { 'rt-launch--off': !primary })} data-testid={testId}>
      {primary ? (
        <a className="rt-launch__link" href={primary.url} target="_blank" rel="noreferrer" aria-label={t('GUEST_OPEN_APP', { name })}>
          {body}
        </a>
      ) : (
        <div className="rt-launch__link">{body}</div>
      )}
      {urls.length > 1 ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button type="button" className="rt-launch__go rt-launch__go--menu" aria-label={t('GUEST_OPEN_WITH', { name })}>
              <IconArrowUpRight size={16} stroke={2.2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{name}</DropdownMenuLabel>
            {urls.map((url) => (
              <DropdownMenuItem key={url.key} onClick={() => window.open(url.url, '_blank', 'noreferrer')}>
                {url.secure ? <IconLock className="text-green me-2" size={16} /> : <IconLockOff className="text-muted me-2" size={16} />}
                {url.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        primary && <IconArrowUpRight className="rt-launch__go" size={16} stroke={2.2} aria-hidden="true" />
      )}
    </div>
  );
};

const GuestHeader = () => {
  const { t } = useTranslation();
  const theme = useUIStore((state) => state.theme);
  const setDarkMode = useUIStore((state) => state.setDarkMode);
  const isDark = theme === 'dark';

  return (
    <header className="rt-guest__top">
      <Link to="/dashboard" className="rt-brand">
        <RuntipiLogo />
        <span className="rt-brand__name">runtipi</span>
      </Link>
      <div className="rt-guest__actions">
        <a className="rt-guest__toplink" href="https://github.com/runtipi/runtipi" target="_blank" rel="noreferrer">
          <IconCode size={16} stroke={1.8} />
          <span>{t('HEADER_SOURCE_CODE')}</span>
        </a>
        <a className="rt-guest__toplink" href="https://github.com/runtipi/runtipi?sponsor=1" target="_blank" rel="noreferrer">
          <IconHeart size={16} stroke={1.8} />
          <span>{t('HEADER_SPONSOR')}</span>
        </a>
        <button
          type="button"
          className="rt-guest__icon-btn"
          onClick={() => window.open('/api/system/certificate')}
          aria-label={t('GUEST_DASHBOARD_DOWNLOAD_CERTIFICATE_TOOLTIP')}
          title={t('GUEST_DASHBOARD_DOWNLOAD_CERTIFICATE_TOOLTIP')}
          data-testid="download-certificate-button"
        >
          <IconCertificate size={17} stroke={1.8} />
        </button>
        <button
          type="button"
          className="rt-guest__icon-btn"
          onClick={() => setDarkMode(!isDark)}
          aria-label={isDark ? t('HEADER_LIGHT_MODE') : t('HEADER_DARK_MODE')}
          title={isDark ? t('HEADER_LIGHT_MODE') : t('HEADER_DARK_MODE')}
        >
          {isDark ? <IconSun size={17} stroke={1.8} /> : <IconMoon size={17} stroke={1.8} />}
        </button>
        <Link to="/login" className="rt-btn rt-guest__signin">
          <IconLogin2 size={16} stroke={1.8} />
          {t('AUTH_LOGIN_SUBMIT')}
        </Link>
      </div>
    </header>
  );
};

export const GuestDashboard = () => {
  const { t } = useTranslation();
  const { localDomain, sslPort } = useUserContext();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: appsData } = useSuspenseQuery({ ...getGuestAppsOptions() });
  const { data: linksData } = useSuspenseQuery({ ...getGuestLinksOptions() });

  // "/" jumps to the search, unless the user is already typing somewhere
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key !== '/' || target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const needle = query.trim().toLowerCase();
  const matches = (...texts: (string | null | undefined)[]) => !needle || texts.some((text) => text?.toLowerCase().includes(needle));

  const apps = appsData.installed.filter(({ info }) => matches(info.name, info.short_desc));
  const links = linksData.links.filter((link: CustomLink) => matches(link.title, link.description));

  const groups = Object.entries(
    apps.reduce<Record<string, GuestApp[]>>((acc, app) => {
      const group = getGroup(app);
      acc[group] = [...(acc[group] ?? []), app];
      return acc;
    }, {}),
  )
    .map(([category, list]) => ({ category, apps: list.sort((a, b) => a.info.name.localeCompare(b.info.name)) }))
    .sort((a, b) => b.apps.length - a.apps.length || a.category.localeCompare(b.category));

  const total = appsData.installed.length;
  const hasContent = total > 0 || linksData.links.length > 0;

  const groupTitle = (category: string) => (category === 'other' ? t('MY_APPS_GROUP_OTHER') : t(`APP_CATEGORY_${category.toUpperCase()}`));

  return (
    <div className="rt-guest">
      <GuestHeader />

      <main className="rt-guest__main">
        <section className="rt-guest__hero">
          {total > 0 && (
            <div className="rt-guest__status">
              <span className="rt-guest__status-dot" aria-hidden="true" />
              <span className="rt-mono">{t('GUEST_STATUS_ALL_UP', { count: total })}</span>
            </div>
          )}
          <h1 className="rt-guest__title">
            <Trans t={t} i18nKey="GUEST_HEADLINE" components={{ accent: <span className="rt-guest__accent" /> }} />
          </h1>
          <p className="rt-guest__intro">{t('GUEST_INTRO')}</p>
          {hasContent && (
            <label className="rt-guest__search">
              <IconSearch size={20} stroke={1.8} aria-hidden="true" />
              <span className="rt-sr">{t('GUEST_SEARCH')}</span>
              <input ref={searchRef} type="search" placeholder={t('GUEST_SEARCH')} value={query} onChange={(event) => setQuery(event.target.value)} />
              <span className="rt-kbd" aria-hidden="true">
                /
              </span>
            </label>
          )}
        </section>

        {!hasContent && (
          <div className="rt-guest__empty">
            <p className="rt-guest__empty-title">{t('GUEST_DASHBOARD_NO_APPS')}</p>
            <p>{t('GUEST_DASHBOARD_NO_APPS_SUBTITLE')}</p>
          </div>
        )}

        {groups.map(({ category, apps: list }) => (
          <section key={category} className="rt-guest__group" aria-labelledby={`guest-group-${category}`}>
            <div className="rt-section-title">
              <h2 id={`guest-group-${category}`}>{groupTitle(category)}</h2>
              <span className="rt-section-title__count">{String(list.length).padStart(2, '0')}</span>
              <span className="rt-section-title__rule" />
            </div>
            <div className="rt-guest__grid">
              {list.map((app) => (
                <LaunchCard
                  key={app.app.id}
                  name={app.info.name}
                  description={app.info.short_desc}
                  urls={getGuestUrls(app, localDomain, sslPort)}
                  icon={<AppIcon name={app.info.name} urn={app.info.urn} categories={app.info.categories} status="run" size={52} />}
                />
              ))}
            </div>
          </section>
        ))}

        {links.length > 0 && (
          <section className="rt-guest__group" aria-labelledby="guest-group-links">
            <div className="rt-section-title">
              <h2 id="guest-group-links">{t('MY_APPS_GROUP_LINKS')}</h2>
              <span className="rt-section-title__count">{String(links.length).padStart(2, '0')}</span>
              <span className="rt-section-title__rule" />
            </div>
            <div className="rt-guest__grid">
              {links.map((link) => (
                <LaunchCard
                  key={link.id}
                  name={link.title}
                  description={link.description}
                  urls={[{ key: 'link', label: link.url, url: link.url, secure: link.url.startsWith('https') }]}
                  icon={<AppIcon name={link.title} src={link.iconUrl || undefined} size={52} />}
                  testId={`guest-link-tile-${link.title}`}
                />
              ))}
            </div>
          </section>
        )}

        {hasContent && groups.length === 0 && links.length === 0 && (
          <p className="rt-guest__nomatch">{t('GUEST_NO_MATCH', { query: query.trim() })}</p>
        )}
      </main>

      <footer className="rt-guest__footer">
        <span>
          <Trans t={t} i18nKey="GUEST_HOSTED_WITH" components={{ strong: <span className="rt-guest__footer-brand" /> }} />
        </span>
        <span>
          {t('GUEST_RUN_THIS_SERVER')}{' '}
          <Link to="/login" className="rt-guest__footer-link">
            {t('GUEST_SIGN_IN_TO_MANAGE')}
          </Link>
        </span>
      </footer>
    </div>
  );
};
