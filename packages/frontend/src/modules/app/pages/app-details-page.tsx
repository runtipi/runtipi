import { getAppDetailsOptions } from '@/api-client/@tanstack/react-query.gen';
import { AppLogo } from '@/components/app-logo/app-logo';
import { useAppContext } from '@/context/app-context';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { AppStatus } from '../components/app-status/app-status';
import { AppActions } from '../containers/app-actions/app-actions';
import { AppDetailsTabs } from '../containers/app-details-tabs/app-details-tabs';

export const AppDetailsPage = () => {
  const { t } = useTranslation();

  const { appId } = useParams<{ appId: string }>();

  const { data } = useSuspenseQuery({
    ...getAppDetailsOptions({ path: { id: appId ?? '' } }),
  });
  const { userSettings } = useAppContext();

  const { app, info, updateInfo, userCompose } = data;

  return (
    <div className="card" data-testid="app-details">
      <div className="card-header d-flex flex-column flex-md-row">
        <AppLogo id={app.id} size={130} alt={info.name} />
        <div className="w-100 d-flex flex-column ms-md-3 align-items-center align-items-md-start">
          <div>
            <span className="mt-1 me-1">{t('APP_DETAILS_VERSION')}: </span>
            <span className="badge bg-muted mt-2 text-white">{info.version}</span>
          </div>
          <span className="mt-1 text-muted text-center text-md-start mb-2">{info.short_desc}</span>
          <div className="mb-1">
            <AppStatus status={app.status} />
          </div>
          <AppActions app={app} updateInfo={updateInfo} info={info} localDomain={userSettings.localDomain} userCompose={userCompose} />
        </div>
      </div>
      <AppDetailsTabs info={info} app={app} userCompose={userCompose} />
    </div>
  );
};
