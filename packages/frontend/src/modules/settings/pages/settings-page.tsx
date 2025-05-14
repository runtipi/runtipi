import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppContext } from '@/context/app-context';
import { Suspense, lazy } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { AppStoresContainer } from '../containers/app-stores-container';

const GeneralActionsContainer = lazy(() => import('../containers/general-actions').then((module) => ({ default: module.GeneralActionsContainer })));
const UserSettingsContainer = lazy(() => import('../containers/user-settings').then((module) => ({ default: module.UserSettingsContainer })));
const SecurityContainer = lazy(() => import('../containers/security').then((module) => ({ default: module.SecurityContainer })));
const LogsContainer = lazy(() => import('../containers/logs').then((module) => ({ default: module.LogsContainer })));

export default () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  const { userSettings, user } = useAppContext();
  const [currentTab, setCurrentTab] = React.useState(tab || 'actions');

  const handleTabChange = (newTab: string) => {
    setCurrentTab(newTab);
    navigate(`?tab=${newTab}`, { replace: true });
  };

  return (
    <div className="card d-flex">
      <Tabs value={currentTab}>
        <TabsList>
          <TabsTrigger onClick={() => handleTabChange('actions')} value="actions">
            {t('SETTINGS_ACTIONS_TAB_TITLE')}
          </TabsTrigger>
          <TabsTrigger onClick={() => handleTabChange('settings')} value="settings">
            {t('SETTINGS_GENERAL_TAB_TITLE')}
          </TabsTrigger>
          <TabsTrigger onClick={() => handleTabChange('security')} value="security">
            {t('SETTINGS_SECURITY_TAB_TITLE')}
          </TabsTrigger>
          <TabsTrigger onClick={() => handleTabChange('appstores')} value="appstores" className="d-none d-md-block">
            {t('SETTINGS_APPSTORES_TAB_TITLE')}
          </TabsTrigger>
          <TabsTrigger onClick={() => handleTabChange('logs')} value="logs" className="d-none d-md-block">
            {t('SETTINGS_LOGS_TAB_TITLE')}
          </TabsTrigger>
          <DropdownMenu>
            <DropdownMenuTrigger className="nav-link dropdown-toggle d-block d-md-none">{t('MORE')}</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleTabChange('appstores')}>{t('SETTINGS_APPSTORES_TAB_TITLE')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTabChange('logs')}>{t('SETTINGS_LOGS_TAB_TITLE')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TabsList>
        <TabsContent value="actions">
          <Suspense>
            <GeneralActionsContainer />
          </Suspense>
        </TabsContent>
        <TabsContent value="settings">
          <Suspense>
            <UserSettingsContainer initialValues={userSettings} />
          </Suspense>
        </TabsContent>
        <TabsContent value="security">
          <Suspense>
            <SecurityContainer totpEnabled={Boolean(user.totpEnabled)} username={user.username} />
          </Suspense>
        </TabsContent>
        <TabsContent value="appstores">
          <Suspense>
            <AppStoresContainer />
          </Suspense>
        </TabsContent>
        <TabsContent value="logs">
          <Suspense>
            <LogsContainer />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};
