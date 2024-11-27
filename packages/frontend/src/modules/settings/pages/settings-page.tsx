import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppContext } from '@/context/app-context';
import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

const GeneralActionsContainer = lazy(() => import('../containers/general-actions').then((module) => ({ default: module.GeneralActionsContainer })));
const UserSettingsContainer = lazy(() => import('../containers/user-settings').then((module) => ({ default: module.UserSettingsContainer })));
const SecurityContainer = lazy(() => import('../containers/security').then((module) => ({ default: module.SecurityContainer })));
const LogsContainer = lazy(() => import('../containers/logs').then((module) => ({ default: module.LogsContainer })));

export const SettingsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  const { userSettings, user } = useAppContext();

  const handleTabChange = (newTab: string) => {
    navigate(`/settings?tab=${newTab}`, { replace: true });
  };

  return (
    <div className="card d-flex">
      <Tabs defaultValue={tab || 'actions'}>
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
          <TabsTrigger onClick={() => handleTabChange('logs')} value="logs">
            {t('SETTINGS_LOGS_TAB_TITLE')}
          </TabsTrigger>
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
        <TabsContent value="logs">
          <Suspense>
            <LogsContainer />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};
