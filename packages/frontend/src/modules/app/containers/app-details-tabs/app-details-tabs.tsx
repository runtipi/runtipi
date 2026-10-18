import type { AppDetails, AppInfo, AppMetadata } from '@/types/app.types';
import { extractAppUrn } from '@/utils/app-helpers';
import type { AppUrn } from '@runtipi/common/types';
import clsx from 'clsx';
import { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { AppAboutPanel, AppAlerts, AppInfoPanel } from '../../components/app-details-view/app-panels';
import './app-details-tabs.css';

const AppBackups = lazy(() =>
  import('../app-backups/app-backups').then((module) => ({
    default: module.AppBackups,
  })),
);
const AppLogs = lazy(() => import('../app-logs/app-logs').then((module) => ({ default: module.AppLogs })));
const AppUserConfig = lazy(() =>
  import('../app-user-config/app-user-config').then((module) => ({
    default: module.AppUserConfig,
  })),
);

const TABS = ['overview', 'backups', 'logs', 'files'] as const;
type Tab = (typeof TABS)[number];

// Tab ids of the previous app page, kept so old links still work
const LEGACY_TABS: Record<string, Tab> = { description: 'overview', notes: 'overview', info: 'overview', 'user-config': 'files' };

const toTab = (value: string | null): Tab => {
  if (!value) return 'overview';
  if (LEGACY_TABS[value]) return LEGACY_TABS[value];
  return (TABS as readonly string[]).includes(value) ? (value as Tab) : 'overview';
};

interface IProps {
  info: AppInfo;
  app?: AppDetails | null;
  metadata?: AppMetadata;
}

export const AppDetailsTabs = ({ info, app, metadata }: IProps) => {
  const { t } = useTranslation();
  const isUserApp = extractAppUrn(info.urn as AppUrn).appStoreId === '_user';

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState<Tab>(toTab(params.get('tab')));

  const labels: Record<Tab, string> = {
    overview: t('APP_PAGE_TAB_OVERVIEW'),
    backups: t('APP_BACKUPS_TAB_TITLE'),
    logs: t('APP_LOGS_TAB_TITLE'),
    files: t('APP_FILES_TAB_TITLE'),
  };

  const handleTabChange = (tab: Tab) => {
    setCurrentTab(tab);
    navigate(`?tab=${tab}`, { replace: true });
  };

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const next = TABS[(index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length] ?? 'overview';
    handleTabChange(next);
    document.getElementById(`rt-appd-tab-${next}`)?.focus();
  };

  return (
    <>
      <div className="rt-seg" role="tablist" aria-label={t('APP_PAGE_SECTIONS')}>
        {TABS.map((tab, index) => (
          <button
            key={tab}
            id={`rt-appd-tab-${tab}`}
            type="button"
            role="tab"
            aria-selected={currentTab === tab}
            aria-controls={`rt-appd-panel-${tab}`}
            tabIndex={currentTab === tab ? 0 : -1}
            className={clsx('rt-seg__btn', { 'is-on': currentTab === tab })}
            onClick={() => handleTabChange(tab)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
          >
            {labels[tab]}
          </button>
        ))}
      </div>

      <div id={`rt-appd-panel-${currentTab}`} role="tabpanel" aria-labelledby={`rt-appd-tab-${currentTab}`} className="rt-appd-tabpanel">
        {currentTab === 'overview' && (
          <>
            <AppAlerts info={info} metadata={metadata} />
            <div className="rt-appd-split">
              <AppAboutPanel info={info} isUserApp={isUserApp} />
              <div className="rt-appd-side-col">
                <AppInfoPanel info={info} app={app} metadata={metadata} />
              </div>
            </div>
          </>
        )}
        {currentTab === 'backups' && (
          <Suspense>
            <AppBackups info={info} status={app?.status ?? 'missing'} />
          </Suspense>
        )}
        {currentTab === 'logs' && (
          <Suspense>
            <AppLogs appUrn={info.urn} isRunning={app?.status === 'running'} />
          </Suspense>
        )}
        {currentTab === 'files' && app && (
          <Suspense>
            <AppUserConfig info={info} />
          </Suspense>
        )}
      </div>
    </>
  );
};
