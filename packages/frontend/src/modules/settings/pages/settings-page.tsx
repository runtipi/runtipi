import { TopBar } from '@/components/layouts/app-shell/top-bar';
import type { RouteHandle } from '@/components/layouts/dashboard/layout';
import { PageHeader } from '@/components/page-header/page-header';
import { useAppContext } from '@/context/app-context';
import clsx from 'clsx';
import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { AppStoresContainer } from '../containers/app-stores-container';
import './settings-page.css';

const GeneralActionsContainer = lazy(() => import('../containers/general-actions').then((module) => ({ default: module.GeneralActionsContainer })));
const UserSettingsContainer = lazy(() => import('../containers/user-settings').then((module) => ({ default: module.UserSettingsContainer })));
const SecurityContainer = lazy(() => import('../containers/security').then((module) => ({ default: module.SecurityContainer })));
const LogsContainer = lazy(() => import('../containers/logs').then((module) => ({ default: module.LogsContainer })));

export const handle: RouteHandle = { ownHeader: true };

const SECTIONS = ['general', 'security', 'appstores', 'updates', 'logs'] as const;
type Section = (typeof SECTIONS)[number];

// Tabs of the previous settings page, kept so old links still work
const LEGACY_TABS: Record<string, Section> = { settings: 'general', actions: 'updates' };

const toSection = (tab: string | null) => {
  if (!tab) return 'general';
  if (LEGACY_TABS[tab]) return LEGACY_TABS[tab];
  return (SECTIONS as readonly string[]).includes(tab) ? (tab as Section) : 'general';
};

export default () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userSettings, user } = useAppContext();
  const section = toSection(searchParams.get('tab'));

  const content: Record<Section, React.ReactNode> = {
    general: <UserSettingsContainer initialValues={userSettings} />,
    security: <SecurityContainer totpEnabled={Boolean(user.totpEnabled)} username={user.username} />,
    appstores: <AppStoresContainer />,
    updates: <GeneralActionsContainer />,
    logs: <LogsContainer />,
  };

  return (
    <>
      <TopBar placeholder={t('SETTINGS_SEARCH_PLACEHOLDER')} />
      <PageHeader eyebrow={t('SETTINGS_EYEBROW')} title={t('HEADER_SETTINGS')} subtitle={t('SETTINGS_SUBTITLE')} />

      <div className="rt-settings">
        <nav className="rt-settings__nav" aria-label={t('HEADER_SETTINGS')}>
          {SECTIONS.map((id, index) => (
            <button
              key={id}
              type="button"
              className={clsx('rt-settings__tab', { 'is-on': section === id })}
              aria-current={section === id ? 'page' : undefined}
              onClick={() => setSearchParams({ tab: id }, { replace: true })}
            >
              <span className="rt-settings__ix rt-mono">{String(index + 1).padStart(2, '0')}</span>
              {t(`SETTINGS_SECTION_${id.toUpperCase()}`)}
            </button>
          ))}
        </nav>
        <div key={section} className="rt-settings__content rt-swap-enter">
          <Suspense>{content[section]}</Suspense>
        </div>
      </div>
    </>
  );
};
