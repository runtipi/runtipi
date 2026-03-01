import { useTranslation } from 'react-i18next';
import { redirect, useNavigate, useParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { convertLegacyToYaml, convertYamlToLegacy } from '@runtipi/common/schemas';
import * as yaml from 'yaml';
import { MultiServiceForm } from '@/components/multi-service-form/multi-service-form';
import { Input } from '@/components/ui/Input/Input';
import type { TranslatableError } from '@/types/error.types';
import { useEffect, useId, useState } from 'react';
import { useMultiServiceStore } from '@/stores/multiServiceStore';
import type { Route } from './+types/app-edit-page';
import { getAppConfig } from '@/api-client/app-config';

export async function clientLoader({ params }: Route.ActionArgs) {
  const { appId, storeId } = params;

  if (!appId) {
    return redirect('/apps');
  }

  const urn = storeId ? `${appId}:${storeId}` : `${appId}:_user`;

  const { data } = await getAppConfig({ path: { urn } });

  const configData = data as { config?: string };
  if (!configData.config) {
    return redirect('/apps');
  }

  return { config: configData.config, urn };
}

export default function AppEditPage({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const params = useParams<{ appId: string; storeId: string }>();
  const { setServices } = useMultiServiceStore();
  const id = useId();

  const appName = params.appId;
  const storeId = params.storeId || '_user';
  const urn = `${appName}:${storeId}`;

  useEffect(() => {
    if (loaderData?.config) {
      try {
        const parsed = convertYamlToLegacy(JSON.parse(loaderData.config));
        const servicesWithId = parsed.services.map((service) => ({
          _id: id + Math.random().toString(36).substring(2, 9),
          ...service,
        }));
        setServices(servicesWithId);
        setReady(true);
      } catch (_e) {
        toast.error(t('APP_CONFIG_PARSE_ERROR'));
        navigate('/apps');
      }
    }
  }, [loaderData, setServices, id, navigate, t]);

  const updateApp = useMutation({
    mutationFn: async (config: string) => {
      const { updateAppConfig } = await import('@/api-client/app-config');
      return updateAppConfig({ path: { urn }, body: { config } });
    },
    onSuccess: () => {
      toast.success(t('APP_CONFIG_UPDATE_SUCCESS', { name: appName }));
      navigate(`/apps/${storeId === '_user' ? appName : `${storeId}/${appName}`}`);
    },
    onError: (error: TranslatableError) => {
      toast.error(t(error.message || 'APP_CONFIG_UPDATE_ERROR'));
    },
  });

  const onSubmit = (data: ReturnType<typeof convertYamlToLegacy>) => {
    updateApp.mutate(yaml.stringify(convertLegacyToYaml(data)));
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
                    {t('APP_NAME_LABEL')} <span className="text-danger">*</span>
                  </>
                }
                value={appName}
                disabled={true}
                placeholder={t('APP_NAME_PLACEHOLDER')}
              />
              <div className="form-text">{t('APP_EDIT_NAME_HELP')}</div>
            </div>
          </div>
        </div>
      </div>
      <MultiServiceForm onSubmit={onSubmit} />
    </>
  );
}
