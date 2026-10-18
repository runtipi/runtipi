import { getInstalledAppsOptions, logoutMutation } from '@/api-client/@tanstack/react-query.gen';
import { useAppContext } from '@/context/app-context';
import { useUIStore } from '@/stores/ui-store';
import {
  IconAdjustmentsHorizontal,
  IconCode,
  IconHeart,
  IconHome,
  IconLayoutGrid,
  IconLogout,
  IconMoon,
  IconShoppingBag,
  IconSun,
  type IconAperture,
} from '@tabler/icons-react';
import { useIsMutating, useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import semver from 'semver';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { RuntipiLogo } from './runtipi-logo';

type NavItem = {
  to: string;
  label: string;
  icon: typeof IconAperture;
  count?: number;
};

export const isRuntipiUpdateAvailable = (version: { current: string; latest: string }) =>
  version.current !== 'nightly' &&
  Boolean(semver.valid(version.current)) &&
  Boolean(semver.valid(version.latest)) &&
  semver.lt(version.current, version.latest);

export const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { version } = useAppContext();
  const theme = useUIStore((state) => state.theme);
  const setDarkMode = useUIStore((state) => state.setDarkMode);
  const pendingMutations = useIsMutating();

  const { data: apps } = useQuery({ ...getInstalledAppsOptions() });

  const logout = useMutation({
    ...logoutMutation(),
    onSuccess: () => {
      window.location.reload();
    },
  });

  const items: NavItem[] = [
    { to: '/dashboard', label: t('HEADER_DASHBOARD'), icon: IconHome },
    { to: '/apps', label: t('HEADER_APPS'), icon: IconLayoutGrid, count: apps?.installed.length },
    { to: '/app-store', label: t('HEADER_APP_STORE'), icon: IconShoppingBag },
    { to: '/settings', label: t('HEADER_SETTINGS'), icon: IconAdjustmentsHorizontal },
  ];

  const isDark = theme === 'dark';
  const updateAvailable = isRuntipiUpdateAvailable(version);

  return (
    <div className="rt-sidebar__inner">
      <Link to="/dashboard" className="rt-sidebar__brand" onClick={onNavigate}>
        <RuntipiLogo size={26} />
        <span className="rt-display">runtipi</span>
      </Link>

      <nav aria-label={t('HEADER_MAIN_NAVIGATION')} className="rt-sidebar__nav">
        {items.map(({ to, label, icon: Icon, count }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to}
              className={clsx('rt-navlink', { 'is-on': active })}
              aria-current={active ? 'page' : undefined}
              onClick={onNavigate}
              data-testid={`nav-item-${to.slice(1)}`}
            >
              <Icon size={18} stroke={1.8} aria-hidden="true" />
              <span className="rt-navlink__label">{label}</span>
              {count !== undefined && <span className="rt-mono rt-navlink__count">{count}</span>}
            </Link>
          );
        })}
      </nav>

      {updateAvailable && (
        <Link to="/settings?tab=updates" className="rt-sidebar__update" onClick={onNavigate}>
          <span className="rt-mono rt-sidebar__update-eyebrow">{t('SIDEBAR_UPDATE_READY')}</span>
          <span className="rt-sidebar__update-title">Runtipi {version.latest}</span>
          <span className="rt-sidebar__update-sub">{t('SIDEBAR_UPDATE_CURRENT', { version: version.current })}</span>
        </Link>
      )}

      <div className="rt-sidebar__footer">
        <a className="rt-navlink" href="https://github.com/runtipi/runtipi" target="_blank" rel="noreferrer">
          <IconCode size={18} stroke={1.8} aria-hidden="true" />
          {t('HEADER_SOURCE_CODE')}
        </a>
        <a className="rt-navlink" href="https://github.com/runtipi/runtipi?sponsor=1" target="_blank" rel="noreferrer">
          <IconHeart size={18} stroke={1.8} aria-hidden="true" />
          {t('HEADER_SPONSOR')}
        </a>
        <div className="rt-sidebar__actions">
          <button
            type="button"
            className="rt-icon-btn"
            onClick={() => setDarkMode(!isDark)}
            aria-label={isDark ? t('HEADER_LIGHT_MODE') : t('HEADER_DARK_MODE')}
            title={isDark ? t('HEADER_LIGHT_MODE') : t('HEADER_DARK_MODE')}
            data-testid={isDark ? 'light-mode-toggle' : 'dark-mode-toggle'}
          >
            {isDark ? <IconSun size={17} stroke={1.8} /> : <IconMoon size={17} stroke={1.8} />}
          </button>
          <button
            type="button"
            className="rt-icon-btn"
            onClick={() => logout.mutate({})}
            disabled={pendingMutations > 0 || logout.isPending}
            aria-label={t('HEADER_LOGOUT')}
            title={t('HEADER_LOGOUT')}
            data-testid="logout-button"
          >
            <IconLogout size={17} stroke={1.8} />
          </button>
        </div>
      </div>
    </div>
  );
};
