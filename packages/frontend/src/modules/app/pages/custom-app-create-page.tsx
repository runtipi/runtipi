import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { z } from 'zod';
import type { dynamicComposeSchemaArk } from '@runtipi/common/schemas';
import { MultiServiceForm } from '@/components/multi-service-form/multi-service-form';
import { createCustomAppMutation } from '@/api-client/@tanstack/react-query.gen';
import { Input } from '@/components/ui/Input/Input';
import type { TranslatableError } from '@/types/error.types';
import { useState } from 'react';

export default () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [appName, setAppName] = useState('');
  const [appNameError, setAppNameError] = useState<string>();

  const appNameSchema = z
    .string()
    .min(1, t('CUSTOM_APP_NAME_REQUIRED'))
    .max(50, t('CUSTOM_APP_NAME_MAX_LENGTH'))
    .regex(/^[a-z0-9-]+$/, t('CUSTOM_APP_NAME_VALIDATION_HELP'))
    .refine((name) => !name.startsWith('-') && !name.endsWith('-'), t('CUSTOM_APP_NAME_NO_HYPHEN_EDGES'));

  const createCustomApp = useMutation({
    ...createCustomAppMutation(),
    onSuccess: () => {
      toast.success(t('CUSTOM_APP_CREATE_SUCCESS', { name: appName }));
      navigate(`/apps/${appName}`);
    },
    onError: (error: TranslatableError) => {
      toast.error(t(error.message || 'CUSTOM_APP_CREATE_ERROR'));
    },
  });

  const onSubmit = (data: typeof dynamicComposeSchemaArk.infer) => {
    const validation = appNameSchema.safeParse(appName);
    if (!validation.success) {
      const pretty = z.prettifyError(validation.error);
      setAppNameError(pretty);
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
      <MultiServiceForm onSubmit={onSubmit} />
    </>
  );
};
