import { getAllAppStoresOptions } from '@/api-client/@tanstack/react-query.gen';
import { IconAlertCircle } from '@tabler/icons-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AddAppStoreDialog } from '../components/add-app-store-dialog/add-app-store-dialog';
import { AppStoresTable } from '../components/app-stores-table/app-stores-table';
import { SettingsPanel } from '../components/settings-ui/settings-ui';

export const AppStoresContainer = () => {
  const { t } = useTranslation();

  const { data } = useSuspenseQuery({
    ...getAllAppStoresOptions(),
  });

  return (
    <SettingsPanel title={t('SETTINGS_APPSTORES_TITLE')} description={t('SETTINGS_APPSTORES_SUBTITLE')} action={<AddAppStoreDialog />}>
      <div className="rt-set-warning" role="note">
        <IconAlertCircle size={18} stroke={1.8} aria-hidden="true" />
        {t('SETTINGS_APPSTORES_WARNING')}
      </div>
      <AppStoresTable appStores={data.appStores} />
    </SettingsPanel>
  );
};
