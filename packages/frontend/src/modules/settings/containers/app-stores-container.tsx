import { getAllAppStoresOptions } from '@/api-client/@tanstack/react-query.gen';
import { Alert, AlertDescription, AlertHeading, AlertIcon } from '@/components/ui/Alert/Alert';
import { IconAlertCircle, IconBrandAppstore } from '@tabler/icons-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppStoresTable } from '../components/app-stores-table/app-stores-table';

export const AppStoresContainer = () => {
  const { t } = useTranslation();

  const { data } = useSuspenseQuery({
    ...getAllAppStoresOptions(),
  });

  return (
    <div className="card-body">
      <div className="d-flex align-items-center mb-2">
        <IconBrandAppstore className="me-2" />
        <h2 className="mb-0">{t('SETTINGS_APPSTORES_TITLE')}</h2>
      </div>
      <p className="text-muted">{t('SETTINGS_APPSTORES_SUBTITLE')}</p>
      <Alert variant="warning">
        <AlertIcon>
          <IconAlertCircle stroke={2} />
        </AlertIcon>
        <div>
          <AlertHeading>{t('COMMON_WARNING')}</AlertHeading>
          <AlertDescription>{t('SETTINGS_APPSTORES_WARNING')}</AlertDescription>
        </div>
      </Alert>
      <AppStoresTable appStores={data.appStores} />
    </div>
  );
};
