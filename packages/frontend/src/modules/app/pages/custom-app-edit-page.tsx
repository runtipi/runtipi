import { useTranslation } from 'react-i18next';
import { redirect, useNavigate, useParams } from 'react-router';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { convertLegacyToYaml, convertYamlToLegacy, type dynamicComposeSchemaYaml } from '@runtipi/common/schemas';
import { MultiServiceForm } from '@/components/multi-service-form/multi-service-form';
import { Input } from '@/components/ui/Input/Input';
import type { TranslatableError } from '@/types/error.types';
import { useEffect, useId, useState } from 'react';
import { useMultiServiceStore } from '@/stores/multiServiceStore';
import { getAppComposeDiffOptions, updateCustomAppMutation } from '@/api-client/@tanstack/react-query.gen';
import type { Route } from './+types/custom-app-edit-page';
import { getAppComposeDiff } from '@/api-client';

export async function clientLoader({ params }: Route.ActionArgs) {
  if (!params.appId) {
    return redirect('/apps');
  }

  const composeDiff = await getAppComposeDiff({ path: { urn: `${params.appId}:_user` } });

  if (!composeDiff.data?.current) {
    return redirect('/apps');
  }

  return { composeDiff: composeDiff.data };
}

export default function EditPageContent({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const params = useParams<{ appId: string }>();

  const [appName] = useState(params.appId);
  const { setServices } = useMultiServiceStore();

  const { data: currentConfig } = useSuspenseQuery({
    ...getAppComposeDiffOptions({ path: { urn: `${params.appId}:_user` } }),
    initialData: loaderData?.composeDiff,
  });

  const id = useId();

  useEffect(() => {
    if (currentConfig?.current) {
      const parsed = convertYamlToLegacy(JSON.parse(currentConfig.current));

      const servicesWithId = parsed.services.map((service) => ({
        _id: id + Math.random().toString(36).substring(2, 9),
        ...service,
      }));

      setServices(servicesWithId);
      setReady(true);
    }
  }, [currentConfig, setServices, id]);

  const updateCustomApp = useMutation({
    ...updateCustomAppMutation(),
    onSuccess: () => {
      toast.success(t('CUSTOM_APP_UPDATE_SUCCESS', { name: appName }));
      navigate(`/apps/${appName}`);
    },
    onError: (error: TranslatableError) => {
      toast.error(t(error.message || 'CUSTOM_APP_UPDATE_ERROR'));
    },
  });

  const onSubmit = (data: typeof dynamicComposeSchemaYaml.infer) => {
    updateCustomApp.mutate({ body: { config: data }, path: { urn: `${params.appId}:_user` } });
  };

  if (!ready) {
    return <div>{t('LOADING')}</div>;
  }

  return (
    <>
      <div className="card">
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <Input
                label={
                  <>
                    {t('CUSTOM_APP_NAME_LABEL')} <span className="text-danger">*</span>
                  </>
                }
                value={appName}
                disabled={true}
                placeholder={t('CUSTOM_APP_NAME_PLACEHOLDER')}
                title={t('CUSTOM_APP_NAME_VALIDATION_HELP')}
              />
              <div className="form-text">{t('CUSTOM_APP_NAME_EDIT_HELP')}</div>
            </div>
          </div>
        </div>
      </div>
      <MultiServiceForm onSubmit={(d) => onSubmit(convertLegacyToYaml(d))} />
    </>
  );
}
