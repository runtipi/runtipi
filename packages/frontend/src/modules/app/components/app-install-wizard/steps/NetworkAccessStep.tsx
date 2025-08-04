import type { GetRandomPortResponse } from '@/api-client';
import { getRandomPortMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { InputGroup } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { useAppContext } from '@/context/app-context';
import type { AppInfo } from '@/types/app.types';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import type React from 'react';
import { useEffect } from 'react';
import { type Control, Controller, type FieldErrors, type UseFormRegister, type UseFormSetValue, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'react-tooltip';
import validator from 'validator';
import type { FormValues } from '../../install-form/install-form';
import { useWizard } from '../WizardContext';
import { WizardStep } from '../WizardStep';

interface NetworkAccessStepProps {
  stepIndex: number;
  info: AppInfo;
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  loading?: boolean;
  setValue: UseFormSetValue<FormValues>;
}

export const NetworkAccessStep: React.FC<NetworkAccessStepProps> = ({ stepIndex, info, register, control, errors, loading, setValue }) => {
  const { t } = useTranslation();
  const { userSettings } = useAppContext();
  const { internalIp } = userSettings;
  const { setStepValid } = useWizard();

  const watchOpenPort = useWatch({
    control,
    name: 'openPort',
    defaultValue: !info.force_expose,
  });
  const port = useWatch({ control, name: 'port' });

  // Check if this step should be shown
  const shouldShowStep = info.dynamic_config || info.port;

  // Validate step based on port configuration
  useEffect(() => {
    let isValid = true;

    if (watchOpenPort && port) {
      isValid = validator.isPort(String(port));
    }

    setStepValid(stepIndex, isValid);
  }, [watchOpenPort, port, stepIndex, setStepValid]);

  const randomPortMutation = useMutation({
    ...getRandomPortMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onSuccess: (data: GetRandomPortResponse) => {
      setValue('port', data.port.toString());
    },
  });

  // Skip this step if not needed
  if (!shouldShowStep) {
    return null;
  }

  return (
    <WizardStep stepIndex={stepIndex} title={t('APP_DETAILS_PORT')} description={t('WIZARD_STEP_NETWORK_ACCESS_DESCRIPTION')}>
      <div className="flex flex-col gap-3">
        {info.dynamic_config && (
          <div className="wizard-section">
            <h4 className="mb-3">{t('APP_INSTALL_FORM_PORT_CONFIGURATION')}</h4>

            <Controller
              control={control}
              name="openPort"
              defaultValue={!info.force_expose}
              disabled={info.force_expose}
              render={({ field: { onChange, value, ref, ...props } }) => (
                <Switch
                  {...props}
                  className="mb-3"
                  ref={ref}
                  checked={value}
                  onCheckedChange={onChange}
                  label={
                    <>
                      {t('APP_INSTALL_FORM_OPEN_PORT')}
                      <Tooltip className="tooltip" anchorSelect=".open-port-hint">
                        {t('APP_INSTALL_FORM_OPEN_PORT_HINT', {
                          port: info.port,
                          internalIp,
                        })}
                      </Tooltip>
                      <span className={clsx('ms-1 form-help open-port-hint')}>?</span>
                    </>
                  }
                />
              )}
            />

            {watchOpenPort && (
              <div className="mb-3">
                <InputGroup
                  type="number"
                  defaultValue={info.port}
                  groupSuffix={
                    <Button type="button" onClick={() => randomPortMutation.mutate({})} loading={loading || randomPortMutation.isPending}>
                      {t('APP_INSTALL_FORM_RANDOM')}
                    </Button>
                  }
                  max={65535}
                  {...register('port', {
                    valueAsNumber: true,
                  })}
                  error={errors.port?.message}
                  disabled={loading || randomPortMutation.isPending}
                  placeholder="8484"
                  className="flex-grow-1 input-group"
                />
                <span className="text-muted">{t('APP_INSTALL_FORM_PORT_HINT')}</span>
              </div>
            )}
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
