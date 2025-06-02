import { getAppOptions } from '@/api-client/@tanstack/react-query.gen';
import { AppLogo } from '@/components/app-logo/app-logo';
import { useAppContext } from '@/context/app-context';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { AppStatus } from '../components/app-status/app-status';
import { AppActions } from '../containers/app-actions/app-actions';
import { AppDetailsTabs } from '../containers/app-details-tabs/app-details-tabs';

export default () => {
  const { t } = useTranslation();

  const { appId, storeId } = useParams<{ appId: string; storeId: string }>();

  const getApp = useSuspenseQuery({
    ...getAppOptions({ path: { urn: `${appId}:${storeId}` } }),
  });

  const { userSettings } = useAppContext();

  const { info, app, metadata } = getApp.data;

  return (
    <div className="card" data-testid="app-details">
      <div className="card-header d-flex flex-column flex-md-row">
        <AppLogo urn={info?.urn} size={130} alt={info?.name} />
        <div className="w-100 d-flex flex-column ms-md-3 align-items-center align-items-md-start">
          <div>
            <span className="mt-1 me-1">{t('APP_DETAILS_VERSION')}: </span>
            <span className="badge bg-muted mt-2 text-white">{info?.version}</span>
          </div>
          <span className="mt-1 text-muted text-center text-md-start mb-2">{info?.short_desc}</span>
          <div className="mb-1">
            <AppStatus status={app?.status ?? 'missing'} />
          </div>
          <AppActions app={app} metadata={metadata} info={info} localDomain={userSettings.localDomain} sslPort={userSettings.sslPort} />
        </div>
      </div>
      <AppDetailsTabs info={info} app={app} metadata={metadata} />
    </div>
  );
};
