import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { convertLegacyToYaml, type dynamicComposeSchemaYaml } from '@runtipi/common/schemas';
import { MultiServiceForm } from '@/components/multi-service-form/multi-service-form';
import { createCustomAppMutation } from '@/api-client/@tanstack/react-query.gen';
import { Input } from '@/components/ui/Input/Input';
import type { TranslatableError } from '@/types/error.types';
import { useEffect, useState } from 'react';
import { type } from 'arktype';
import { useMultiServiceStore } from '@/stores/multiServiceStore';

const RESERVED_APP_NAMES = ['create'];

export default () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [appName, setAppName] = useState('');
  const [appNameError, setAppNameError] = useState<string>();
  const { composeExtras, setComposeExtras } = useMultiServiceStore();

  const appNameSchema = type('string').narrow((name, ctx) => {
    if (name.length < 1) ctx.reject({ message: t('CUSTOM_APP_NAME_REQUIRED') });
    if (name.length > 50) ctx.reject({ message: t('CUSTOM_APP_NAME_MAX_LENGTH') });
    if (!/^[a-z0-9-]+$/.test(name)) ctx.reject({ message: t('CUSTOM_APP_NAME_VALIDATION_HELP') });
    if (name.startsWith('-') || name.endsWith('-')) ctx.reject({ message: t('CUSTOM_APP_NAME_NO_HYPHEN_EDGES') });
    if (RESERVED_APP_NAMES.includes(name.toLowerCase())) ctx.reject({ message: t('CUSTOM_APP_NAME_RESERVED') });
    return true;
  });

  const createCustomApp = useMutation({
    ...createCustomAppMutation(),
    onSuccess: () => {
      toast.success(t('CUSTOM_APP_CREATE_SUCCESS', { name: appName }));
      navigate(`/apps/${appName}`);
    },
    onError: (error: TranslatableError) => {
      toast.error(t(error.message || 'CUSTOM_APP_CREATE_ERROR', { ...error.intlParams }));
    },
  });

  useEffect(() => {
    setComposeExtras({});
  }, [setComposeExtras]);

  const onSubmit = (data: typeof dynamicComposeSchemaYaml.infer) => {
    const validation = appNameSchema(appName);
    if (validation instanceof type.errors) {
      setAppNameError(validation.summary);
      return;
    }

    createCustomApp.mutate({ body: { config: data, name: appName } });
  };

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
                onChange={(e) => setAppName(e.target.value)}
                error={appNameError}
                placeholder={t('CUSTOM_APP_NAME_PLACEHOLDER')}
                title={t('CUSTOM_APP_NAME_VALIDATION_HELP')}
                disabled={createCustomApp.isPending}
              />
              <div className="form-text">{t('CUSTOM_APP_NAME_HELP')}</div>
            </div>
          </div>
        </div>
      </div>
      <MultiServiceForm onSubmit={(d) => onSubmit({ ...convertLegacyToYaml(d), ...composeExtras })} />
    </>
  );
};
