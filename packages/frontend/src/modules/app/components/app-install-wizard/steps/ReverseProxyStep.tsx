import { Input, InputGroup } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { useAppContext } from '@/context/app-context';
import type { AppInfo } from '@/types/app.types';
import { extractAppUrn } from '@/utils/app-helpers';
import type { AppUrn } from '@runtipi/common/types';
import clsx from 'clsx';
import type React from 'react';
import { useEffect } from 'react';
import { type Control, Controller, type FieldErrors, type UseFormRegister, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'react-tooltip';
import validator from 'validator';
import type { FormValues } from '../../install-form/install-form';
import { useWizard } from '../WizardContext';
import { WizardStep } from '../WizardStep';

interface ReverseProxyStepProps {
  stepIndex: number;
  info: AppInfo;
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  loading?: boolean;
}

export const ReverseProxyStep: React.FC<ReverseProxyStepProps> = ({ stepIndex, info, register, control, errors, loading }) => {
  const { t } = useTranslation();
  const { userSettings } = useAppContext();
  const { localDomain, domain } = userSettings;
  const { setStepValid } = useWizard();

  const watchExposed = useWatch({
    control,
    name: 'exposed',
    defaultValue: false,
  });
  const watchExposedLocal = useWatch({
    control,
    name: 'exposedLocal',
    defaultValue: false,
  });
  const domainValue = useWatch({ control, name: 'domain' });
  const localSubdomainValue = useWatch({ control, name: 'localSubdomain' });

  const { appName, appStoreId } = extractAppUrn(info.urn as AppUrn);

  // Check if this step should be shown
  const shouldShowStep = Boolean(info.port) && (info.exposable || info.dynamic_config);

  // Validate step based on domain and subdomain configurations
  useEffect(() => {
    let isValid = true;

    // Validate internet domain if exposed
    if (watchExposed && domainValue) {
      isValid = isValid && validator.isFQDN(domainValue);
    }

    // Validate local subdomain if exposedLocal
    if (watchExposedLocal && localSubdomainValue) {
      isValid = isValid && validator.matches(localSubdomainValue, /^[a-zA-Z0-9-]{1,63}$/);
    }

    setStepValid(stepIndex, isValid);
  }, [watchExposed, watchExposedLocal, domainValue, localSubdomainValue, stepIndex, setStepValid]);

  // Skip this step if not needed
  if (!shouldShowStep) {
    return null;
  }

  const renderDynamicConfigProxyForm = () => {
    return (
      <>
        {info.exposable && (
          <>
            <Controller
              control={control}
              name="exposedLocal"
              render={({ field: { onChange, value, ref, ...props } }) => (
                <Switch
                  {...props}
                  className="mb-3"
                  ref={ref}
                  checked={value}
                  onCheckedChange={onChange}
                  label={
                    <>
                      {t('APP_INSTALL_FORM_EXPOSE_LOCAL')}
                      <Tooltip className="tooltip" anchorSelect=".expose-local-hint">
                        {t('APP_INSTALL_FORM_EXPOSE_LOCAL_HINT', {
                          domain: localDomain,
                          appId: info.urn.split(':').join('-'),
                        })}
                      </Tooltip>
                      <span className={clsx('ms-1 form-help expose-local-hint')}>?</span>
                    </>
                  }
                />
              )}
            />
            {watchExposedLocal && (
              <div className="mb-3">
                <InputGroup
                  groupPrefix="https://"
                  groupSuffix={`.${localDomain}`}
                  {...register('localSubdomain')}
                  label={t('APP_INSTALL_FORM_LOCAL_SUBDOMAIN')}
                  error={errors.localSubdomain?.message}
                  disabled={loading}
                  placeholder={info.urn.split(':').join('-')}
                />
              </div>
            )}
            <Controller
              control={control}
              name="enableAuth"
              render={({ field: { onChange, value, ref, ...props } }) => (
                <Switch
                  {...props}
                  className="mb-3"
                  ref={ref}
                  checked={value}
                  onCheckedChange={onChange}
                  label={
                    <>
                      {t('APP_INSTALL_FORM_ENABLE_AUTH')}
                      <Tooltip className="tooltip" anchorSelect=".enable-auth-hint">
                        {t('APP_INSTALL_FORM_ENABLE_AUTH_HINT')}
                      </Tooltip>
                      <span className={clsx('ms-1 form-help enable-auth-hint')}>?</span>
                    </>
                  }
                />
              )}
            />
          </>
        )}
      </>
    );
  };

  const renderExposeForm = () => (
    <>
      <Controller
        control={control}
        name="exposed"
        defaultValue={false}
        render={({ field: { onChange, value, ref, ...props } }) => (
          <Switch
            {...props}
            className="mb-3"
            ref={ref}
            checked={value}
            onCheckedChange={onChange}
            disabled={info.force_expose}
            label={t('APP_INSTALL_FORM_EXPOSE_APP')}
          />
        )}
      />
      {watchExposed && (
        <div className="mb-3">
          <Input
            {...register('domain')}
            label={t('APP_INSTALL_FORM_DOMAIN_NAME')}
            error={errors.domain?.message}
            disabled={loading}
            placeholder={domain ? `${appName}-${appStoreId}.${domain}` : `${appName}-${appStoreId}.example.com`}
          />
          <span className="text-muted">{t('APP_INSTALL_FORM_DOMAIN_NAME_HINT')}</span>
        </div>
      )}
    </>
  );

  return (
    <WizardStep stepIndex={stepIndex} title={t('APP_INSTALL_FORM_REVERSE_PROXY')} description={t('WIZARD_STEP_REVERSE_PROXY_DESCRIPTION')}>
      <div className="flex flex-col gap-4">
        {info.dynamic_config && (
          <div className="wizard-section">
            <h4 className="mb-3">{t('APP_INSTALL_FORM_LOCAL_ACCESS')}</h4>
            {renderDynamicConfigProxyForm()}
          </div>
        )}

        {info.exposable && (
          <div className="wizard-section">
            <h4 className="mb-3">{t('APP_INSTALL_FORM_INTERNET_ACCESS')}</h4>
            {renderExposeForm()}
          </div>
        )}

        {info.force_expose && (
          <div className="alert alert-info">
            <div className="alert-body">
              <p className="mb-0">{t('APP_INSTALL_FORM_FORCE_EXPOSE_INFO')}</p>
            </div>
          </div>
        )}
      </div>
    </WizardStep>
  );
};
