import { useParams, useSearchParams } from 'react-router';
import { AppDetailsTabs } from '../containers/app-details-tabs/app-details-tabs';
import { AppActions } from '../containers/app-actions/app-actions';
import { AppStatus } from '../components/app-status/app-status';
import { CustomAppLogo } from '@/components/custom-app-logo/custom-app-logo';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { getAppOptions, uploadAppImageMutation } from '@/api-client/@tanstack/react-query.gen';
import { useAppContext } from '@/context/app-context';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { TranslatableError } from '@/types/error.types';
import { useState } from 'react';

export const CustomAppDetailsPage = () => {
  const params = useParams<{ appId: string }>();
  const { t } = useTranslation();

  const getApp = useSuspenseQuery({
    ...getAppOptions({ path: { urn: `${params.appId}:_user` } }),
  });

  const { userSettings } = useAppContext();
  const [searchParams] = useSearchParams();
  const [bust, setBust] = useState(searchParams.get('bust'));

  const { info, app, metadata } = getApp.data;

  const imageUrl = new URL(`/api/marketplace/apps/${params.appId}:_user/image`, window.location.origin);

  const uploadImage = useMutation({
    ...uploadAppImageMutation(),
    onSuccess: () => {
      setBust(Date.now().toString());
      fetch(imageUrl.toString(), { method: 'HEAD' });
      toast.success(t('CUSTOM_APP_UPLOAD_SUCCESS'));
    },
    onError: (error: TranslatableError) => {
      toast.error(t(error.message, error.intlParams));
    },
  });

  const handleImageUpload = (file: File) => {
    uploadImage.mutate({
      path: { urn: `${params.appId}:_user` },
      body: { image: file },
    });
  };

  if (bust) {
    imageUrl.searchParams.set('t', bust);
  }

  return (
    <div className="card" data-testid="app-details">
      <div className="card-header d-flex flex-column flex-md-row border-0">
        <CustomAppLogo url={imageUrl.toString()} size={130} alt={info?.name} onImageUpload={handleImageUpload} isUploading={uploadImage.isPending} />
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

export default CustomAppDetailsPage;
