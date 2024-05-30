'use client';

import { IconApps, IconAlertTriangle, IconAlertCircle } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { AddAppStoreForm } from '../AddAppStoreForm';
import { EditAppStoreForm } from '../EditAppStoreForm';
import { DeleteAppStoreDialog } from '../DeleteAppStoreDialog';

interface props {
  appStores: string[];
}

export const AppStores: React.FC<props> = ({ appStores }) => {
  const t = useTranslations();

  return (
    <>
      <div className="d-flex">
        <IconApps className="me-2" />
        <h2 className="text-2xl font-bold">{t('SETTINGS_APP_STORES_TAB_TITLE')}</h2>
      </div>
      <div className="d-flex mb-2">
        <p className="text-muted flex-grow-1">{t('SETTINGS_APP_STORE_SUBTITLE')}</p>
        <AddAppStoreForm />
      </div>
      {appStores.length !== 0 ? (
        <>
          <pre className="p-3">
            <div className="card">{appStores.map((store) => renderAppStore(store))}</div>
          </pre>
          <div className="alert alert-warning" role="alert">
            <div className="d-flex">
              <IconAlertTriangle className="my-auto me-3" />
              <div>
                <h4 className="alert-title">{t('SETTINGS_APP_STORE_WARNING_ALERT_TITLE')}</h4>
                <div className="text-secondary">{t('SETTINGS_APP_STORE_WARNING_ALERT_DESCRIPTION')}</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="alert alert-danger" role="alert">
          <div className="d-flex">
            <IconAlertCircle className="my-auto me-3" />
            <div>
              <h4 className="alert-title">{t('SETTINGS_APP_STORE_ERROR_ALERT_TITLE')}</h4>
              <div className="text-secondary">{t('SETTINGS_APP_STORE_ERROR_ALERT_DESCRIPTION')}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const renderAppStore = (url: string) => {
  return (
    <div key={url} className="card-body d-flex flex-wrap justify-content-between">
      <div style={{ whiteSpace: 'normal' }} className="d-flex">
        <p className="my-auto text-break">{url}</p>
      </div>
      <div className="mt-2 mt-md-0 m-auto m-md-0">
        <EditAppStoreForm appstore={url} />
        <DeleteAppStoreDialog appstore={url} />
      </div>
    </div>
  );
};
