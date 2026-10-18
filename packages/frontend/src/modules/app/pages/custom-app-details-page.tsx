import { useParams, useSearchParams } from 'react-router';
import type { RouteHandle } from '@/components/layouts/dashboard/layout';
import { AppDetailsView } from '../components/app-details-view/app-details-view';
import { CustomAppLogo } from '@/components/custom-app-logo/custom-app-logo';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { getAppOptions, uploadAppImageMutation } from '@/api-client/@tanstack/react-query.gen';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { TranslatableError } from '@/types/error.types';
import { useState } from 'react';

export const handle: RouteHandle = { ownHeader: true };

export const CustomAppDetailsPage = () => {
  const params = useParams<{ appId: string }>();
  const { t } = useTranslation();

  const getApp = useSuspenseQuery({
    ...getAppOptions({ path: { urn: `${params.appId}:_user` } }),
  });

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
    <AppDetailsView
      info={info}
      app={app}
      metadata={metadata}
      icon={
        <CustomAppLogo
          url={imageUrl.toString()}
          size={96}
          alt={info?.name}
          onImageUpload={handleImageUpload}
          isUploading={uploadImage.isPending}
          className="rt-appd-custom-logo"
        />
      }
    />
  );
};

export default CustomAppDetailsPage;
