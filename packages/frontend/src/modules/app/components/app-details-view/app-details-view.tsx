import { getAppBackupsOptions } from '@/api-client/@tanstack/react-query.gen';
import { AppIcon, getCategoryTint, toIconStatus } from '@/components/app-icon/app-icon';
import { useAppContext } from '@/context/app-context';
import type { AppDetails, AppInfo, AppMetadata } from '@/types/app.types';
import { extractAppUrn } from '@/utils/app-helpers';
import type { AppUrn } from '@runtipi/common/types';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { AppActions } from '../../containers/app-actions/app-actions';
import { AppDetailsTabs } from '../../containers/app-details-tabs/app-details-tabs';
import { AppJobProgress } from '../app-job-progress/app-job-progress';
import { formatShortDate, getPreferredAddress } from './app-format';
import { AfterInstallPanel, AppAboutPanel, AppAlerts, AppCategoryChip, AppInfoPanel } from './app-panels';
import './app-details-view.css';

type Props = {
  info: AppInfo;
  app?: AppDetails | null;
  metadata: AppMetadata;
  /** Replaces the app icon, used by custom apps to upload their logo */
  icon?: ReactNode;
};

export const AppDetailsView = ({ info, app, metadata, icon }: Props) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { userSettings } = useAppContext();

  const { appStoreId } = extractAppUrn(info.urn as AppUrn);
  const isUserApp = appStoreId === '_user';
  const status = app?.status ?? 'missing';
  // Apps that are not installed yet get the app store layout, until the install finishes
  const isStoreView = !isUserApp && (status === 'missing' || status === 'installing');
  const fromStore = location.pathname.startsWith('/app-store');
  const tint = getCategoryTint(info.categories);

  return (
    <div className={clsx('rt-appd', `rt-cat--${tint}`)} data-testid="app-details">
      <nav aria-label={t('APP_PAGE_BREADCRUMB')} className="rt-appd-crumbs rt-mono">
        {fromStore ? <Link to="/app-store">← {t('HEADER_APP_STORE')}</Link> : <Link to="/apps">← {t('HEADER_APPS')}</Link>}
        <span aria-hidden="true">/</span>
        <span>{isUserApp ? t('APP_PAGE_STORE_CUSTOM') : appStoreId}</span>
        <span aria-hidden="true">/</span>
        <span className="rt-appd-crumbs__current" aria-current="page">
          {info.name}
        </span>
      </nav>

      {isStoreView ? (
        <StoreView info={info} app={app} metadata={metadata} />
      ) : (
        <>
          <header className="rt-appd-hero">
            <span className="rt-appd-hero__icon">
              {icon ?? <AppIcon name={info.name} urn={info.urn} categories={info.categories} status={toIconStatus(status)} size={96} />}
            </span>
            <div className="rt-appd-hero__text">
              <div className="rt-appd-chips">
                <StatusChip status={status} />
                <span className="rt-appd-chip">v{info.version}</span>
                {isUpdateVisible(app, metadata) && <span className="rt-appd-chip rt-appd-chip--warn">{t('MY_APPS_UPDATE_AVAILABLE')}</span>}
              </div>
              <h1 className="rt-appd-title">{info.name}</h1>
              {info.short_desc && <p className="rt-appd-desc">{info.short_desc}</p>}
            </div>
            <AppActions app={app} metadata={metadata} info={info} localDomain={userSettings.localDomain} sslPort={userSettings.sslPort} />
          </header>

          <AppFacts info={info} app={app} metadata={metadata} storeLabel={isUserApp ? t('APP_PAGE_STORE_CUSTOM') : appStoreId} />

          <AppJobProgress appUrn={info.urn} />

          <AppDetailsTabs info={info} app={app} metadata={metadata} />
        </>
      )}
    </div>
  );
};

const isUpdateVisible = (app: AppDetails | null | undefined, metadata: AppMetadata) => {
  if (!app) return false;
  const versionIsIgnored = app.ignoredVersion === metadata.latestVersion;
  return Number(app.version ?? 0) < Number(metadata.latestVersion || 0) && !versionIsIgnored;
};

const StatusChip = ({ status }: { status: AppDetails['status'] }) => {
  const { t } = useTranslation();
  if (status === 'missing') return null;

  const tone = status === 'running' ? 'ok' : status === 'stopped' ? 'off' : 'busy';

  return (
    <span className={clsx('rt-appd-chip', `rt-appd-chip--${tone}`)}>
      <span className="rt-appd-chip__dot" aria-hidden="true" />
      {t(`APP_STATUS_${status.toUpperCase() as Uppercase<typeof status>}`)}
    </span>
  );
};

type FactsProps = {
  info: AppInfo;
  app?: AppDetails | null;
  metadata: AppMetadata;
  storeLabel: string;
};

const AppFacts = ({ info, app, metadata, storeLabel }: FactsProps) => {
  const { t } = useTranslation();
  const { userSettings } = useAppContext();
  const { localDomain, sslPort, timeZone } = userSettings;

  const backups = useQuery({
    ...getAppBackupsOptions({ path: { urn: info.urn }, query: { page: 1, pageSize: 1 } }),
    enabled: Boolean(app),
  });
  const lastBackup = backups.data?.data[0];

  const port = app?.port ?? info.port;
  const address = getPreferredAddress(info, app, metadata, { localDomain, sslPort });

  return (
    <section className="rt-panel rt-appd-facts" aria-label={t('APP_PAGE_AT_A_GLANCE')}>
      <div className="rt-appd-fact">
        <span className="rt-appd-fact__k">{t('APP_PAGE_ADDRESS')}</span>
        {address ? (
          <a className="rt-appd-fact__v rt-mono" href={address.url} target="_blank" rel="noreferrer">
            {address.label} ↗
          </a>
        ) : (
          <span className="rt-appd-fact__v rt-appd-fact__v--muted">{t('APP_PAGE_NO_ADDRESS')}</span>
        )}
      </div>
      <div className="rt-appd-fact">
        <span className="rt-appd-fact__k">{t('APP_DETAILS_PORT')}</span>
        <span className="rt-appd-fact__v rt-mono">{port ?? '—'}</span>
      </div>
      <div className="rt-appd-fact">
        <span className="rt-appd-fact__k">{t('APP_PAGE_LAST_BACKUP')}</span>
        <span className={clsx('rt-appd-fact__v', { 'rt-appd-fact__v--muted': !lastBackup })}>
          {lastBackup ? formatShortDate(lastBackup.date, timeZone) : t('APP_PAGE_NO_BACKUP')}
        </span>
      </div>
      <div className="rt-appd-fact">
        <span className="rt-appd-fact__k">{t('APP_PAGE_STORE')}</span>
        <span className="rt-appd-fact__v rt-mono">{storeLabel}</span>
      </div>
    </section>
  );
};

const StoreView = ({ info, app, metadata }: Omit<Props, 'icon'>) => {
  const { t } = useTranslation();
  const { userSettings } = useAppContext();
  const { appStoreId } = extractAppUrn(info.urn as AppUrn);
  const status = app?.status ?? 'missing';

  return (
    <>
      <header className="rt-appd-storehero">
        <AppIcon name={info.name} urn={info.urn} categories={info.categories} size={112} className="rt-appd-storehero__icon" />
        <div className="rt-appd-hero__text">
          <div className="rt-appd-chips">
            {info.categories?.[0] && <AppCategoryChip category={info.categories[0]} />}
            <span className="rt-appd-chip">v{info.version}</span>
            <span className="rt-appd-chip">{t('APP_PAGE_FROM_STORE', { store: appStoreId })}</span>
          </div>
          <h1 className="rt-appd-title rt-appd-title--lg">{info.name}</h1>
          {info.short_desc && <p className="rt-appd-desc rt-appd-desc--tint">{info.short_desc}</p>}
        </div>
        <AppActions variant="store" app={app} metadata={metadata} info={info} localDomain={userSettings.localDomain} sslPort={userSettings.sslPort} />
      </header>

      <AppAlerts info={info} metadata={metadata} />

      <div className="rt-appd-split">
        <AppAboutPanel info={info} isUserApp={false} />
        <div className="rt-appd-side-col">
          <AppInfoPanel info={info} />
          {status === 'missing' && <AfterInstallPanel />}
        </div>
      </div>
    </>
  );
};
