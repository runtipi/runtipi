import { useTranslation } from 'react-i18next';
import { redirect, useNavigate, useParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { convertLegacyToYaml, convertYamlToLegacy } from '@runtipi/common/schemas';
import * as yaml from 'yaml';
import { getEditableAppConfig } from '@/api-client';
import { updateEditableAppConfigMutation } from '@/api-client/@tanstack/react-query.gen';
import { MultiServiceForm } from '@/components/multi-service-form/multi-service-form';
import { Input } from '@/components/ui/Input/Input';
import type { TranslatableError } from '@/types/error.types';
import { useEffect, useId, useState } from 'react';
import { useMultiServiceStore } from '@/stores/multiServiceStore';
import type { Route } from './+types/app-edit-page';

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const { appId, storeId } = params;

  if (!appId) {
    return redirect('/apps');
  }

  const urn = storeId ? `${appId}:${storeId}` : `${appId}:_user`;

  const response = await getEditableAppConfig({ path: { urn } });
  const config = response.data?.config;

  if (!config) {
    return redirect('/apps');
  }

  return { config, urn };
}

export default function AppEditPage({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const params = useParams<{ appId: string; storeId: string }>();
  const { composeExtras, setComposeExtras, setServices } = useMultiServiceStore();
  const id = useId();

  const appName = params.appId ?? '';
  const storeId = params.storeId || '_user';
  const urn = `${appName}:${storeId}`;

  useEffect(() => {
    if (loaderData?.config) {
      try {
        const yamlConfig = JSON.parse(loaderData.config) as Record<string, unknown>;
        const parsed = convertYamlToLegacy(yamlConfig);
        const servicesWithId = parsed.services.map((service) => ({
          _id: id + Math.random().toString(36).substring(2, 9),
          ...service,
        }));
        setComposeExtras(Object.fromEntries(Object.entries(yamlConfig).filter(([key]) => key !== 'services' && key !== 'x-runtipi')));
        setServices(servicesWithId);
        setReady(true);
      } catch (_e) {
        toast.error(t('APP_CONFIG_PARSE_ERROR'));
        navigate('/apps');
      }
    }
  }, [loaderData, setComposeExtras, setServices, id, navigate, t]);

  const updateApp = useMutation({
    ...updateEditableAppConfigMutation(),
    onSuccess: () => {
      toast.success(t('APP_CONFIG_UPDATE_SUCCESS', { name: appName }));
      navigate(`/apps/${storeId === '_user' ? appName : `${storeId}/${appName}`}`);
    },
    onError: (error: TranslatableError) => {
      toast.error(t(error.message || 'APP_CONFIG_UPDATE_ERROR'));
    },
  });

  const onSubmit = (data: ReturnType<typeof convertYamlToLegacy>) => {
    updateApp.mutate({ path: { urn }, body: { config: yaml.stringify({ ...convertLegacyToYaml(data), ...composeExtras }, { nullStr: '' }) } });
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
