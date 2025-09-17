import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { MultiServiceForm } from '@/components/multi-service-form/multi-service-form';
import { createCustomAppMutation } from '@/api-client/@tanstack/react-query.gen';
import type { TranslatableError } from '@/types/error.types';

export default () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [appName, setAppName] = useState('');

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

  return (
    <>
      <div className="card">
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <label htmlFor="appName" className="form-label">
                {t('CUSTOM_APP_NAME_LABEL')} <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="appName"
                className="form-control"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder={t('CUSTOM_APP_NAME_PLACEHOLDER')}
                title={t('CUSTOM_APP_NAME_VALIDATION_HELP')}
              />
              <div className="form-text">{t('CUSTOM_APP_NAME_HELP')}</div>
            </div>
          </div>
        </div>
      </div>
      <MultiServiceForm onSubmit={(d) => createCustomApp.mutate({ body: { config: d, name: appName } })} />
    </>
  );
};
