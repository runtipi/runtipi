import { getAllAppStoresOptions } from '@/api-client/@tanstack/react-query.gen';
import { IconAlertTriangle, IconBrandAppstore } from '@tabler/icons-react';
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
      <div className="d-flex mb-2">
        <IconBrandAppstore className="me-2" />
        <h2 className="mb-0">{t('SETTINGS_APPSTORES_TITLE')}</h2>
      </div>
      <p className="text-muted">{t('SETTINGS_APPSTORES_SUBTITLE')}</p>
      <div className="alert alert-warning" role="alert">
        <div className="d-flex align-items-center">
          <div className="me-3">
            <IconAlertTriangle stroke={2} />
          </div>
          <div>
            <h4 className="alert-title">{t('COMMON_WARNING')}</h4>
            <div className="text-secondary">{t('SETTINGS_APPSTORES_WARNING')}</div>
          </div>
        </div>
      </div>
      <AppStoresTable appStores={data.appStores} />
    </div>
  );
};
