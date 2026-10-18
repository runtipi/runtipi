import type { MyAppsDto } from '@/api-client';
import { AppIcon, toIconStatus } from '@/components/app-icon/app-icon';
import { AppOpenMenu } from '@/modules/app/components/app-open-menu/app-open-menu';
import { IconArrowRight, IconPlus } from '@tabler/icons-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { padCount } from '../attention-banner';
import './app-launcher.css';

type InstalledApp = MyAppsDto['installed'][number];

const statusOrder = (app: InstalledApp) => (app.app.status === 'running' ? 0 : 1);

/**
 * "Your apps" row of the dashboard. Clicking an app opens a menu with the links it can be opened with.
 */
export const AppLauncher = ({ installed }: { installed: InstalledApp[] }) => {
  const { t } = useTranslation();

  const apps = installed
    .filter(({ info }) => info.available)
    .sort((a, b) => statusOrder(a) - statusOrder(b) || a.info.name.localeCompare(b.info.name));

  return (
    <section className="rt-your-apps" aria-labelledby="rt-your-apps-title">
      <div className="rt-section-title">
        <h2 id="rt-your-apps-title">{t('DASHBOARD_YOUR_APPS')}</h2>
        <span className="rt-section-title__count">{padCount(apps.length)}</span>
        <span className="rt-section-title__rule" />
        <Link to="/apps" className="rt-your-apps__all">
          {t('DASHBOARD_SEE_ALL')}
          <IconArrowRight size={14} stroke={1.8} aria-hidden="true" />
        </Link>
      </div>
      <div className="rt-your-apps__grid" data-testid="app-launcher">
        {apps.map((app) => {
          const isRunning = app.app.status === 'running';
          return (
            <AppOpenMenu key={app.info.urn} app={app}>
              <button type="button" className={clsx('rt-applink', { 'rt-applink--off': !isRunning })}>
                <AppIcon
                  name={app.info.name}
                  urn={app.info.urn}
                  categories={app.info.categories}
                  status={toIconStatus(app.app.status)}
                  inactive={!isRunning}
                  size={44}
                />
                <span className="rt-applink__name">{app.info.name}</span>
                <span className="rt-sr">{t(`APP_STATUS_${app.app.status.toUpperCase()}`)}</span>
              </button>
            </AppOpenMenu>
          );
        })}
        <Link to="/app-store" className="rt-applink rt-applink--add">
          <span className="rt-applink__plus" aria-hidden="true">
            <IconPlus size={18} stroke={1.8} />
          </span>
          <span>{t('DASHBOARD_INSTALL_MORE')}</span>
        </Link>
      </div>
    </section>
  );
};
