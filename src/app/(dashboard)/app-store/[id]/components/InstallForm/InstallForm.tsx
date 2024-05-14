import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Tooltip } from 'react-tooltip';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { type FormField, type AppInfo } from '@runtipi/shared';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AppStatus } from '@/server/db/schema';
import { useClientSettings } from '@/hooks/use-client-settings';
import { validateAppConfig } from '../../utils/validators';
import { InstallFormField } from './InstallFormField';
import { FormValues } from './InstallForm.types';

interface IProps {
  formFields: FormField[];
  onSubmit: (values: FormValues) => void;
  initialValues?: { [key: string]: unknown };
  info: AppInfo;
  loading?: boolean;
  onReset?: () => void;
  status?: AppStatus;
}

const hiddenTypes = ['random'];
const typeFilter = (field: FormField) => !hiddenTypes.includes(field.type);

export const InstallForm: React.FC<IProps> = ({ formFields, info, onSubmit, initialValues, loading, onReset, status }) => {
  const t = useTranslations();
  const { guestDashboard, localDomain, internalIp } = useClientSettings();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    setError,
    control,
  } = useForm<FormValues>({});
  const watchExposed = watch('exposed', false);
  // const watchExposedLocal = watch('exposedLocal', false);

  useEffect(() => {
    if (info.force_expose) {
      setValue('exposed', true);
    }
  }, [info.force_expose, setValue]);

  useEffect(() => {
    if (initialValues && !isDirty) {
      Object.entries(initialValues).forEach(([key, value]) => {
        setValue(key, value as string);
      });
    }
  }, [initialValues, isDirty, setValue]);

  const onClickReset = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    if (onReset) onReset();
  };

  const renderField = (field: FormField) => {
    return (
      <InstallFormField
        loading={loading}
        initialValue={(initialValues ? initialValues[field.env_variable] : field.default) as string}
        register={register}
        field={field}
        control={control}
        key={field.env_variable}
        error={errors[field.env_variable]?.message}
      />
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
            placeholder={t('APP_INSTALL_FORM_DOMAIN_NAME')}
          />
          <span className="text-muted">{t('APP_INSTALL_FORM_DOMAIN_NAME_HINT')}</span>
        </div>
      )}
    </>
  );

  const renderDynamicConfigForm = () => {
    return (
      <>
        <Controller
          control={control}
          name="openPort"
          defaultValue
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
                    {t('APP_INSTALL_FORM_OPEN_PORT_HINT', { port: info.port, internalIp })}
                  </Tooltip>
                  <span className={clsx('ms-1 form-help open-port-hint')}>?</span>
                </>
              }
            />
          )}
        />
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
                    {t('APP_INSTALL_FORM_EXPOSE_LOCAL_HINT', { domain: localDomain, appId: info.id })}
                  </Tooltip>
                  <span className={clsx('ms-1 form-help expose-local-hint')}>?</span>
                </>
              }
            />
          )}
        />
      </>
    );
  };

  const validate = (values: FormValues) => {
    const validationErrors = validateAppConfig(values, formFields);

    Object.entries(validationErrors).forEach(([key, value]) => {
      if (value) {
        setError(key, { message: value });
      }
    });

    if (Object.keys(validationErrors).length === 0) {
      onSubmit(values);
    }
  };

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(validate)}>
      {info.dynamic_config || guestDashboard || (formFields.filter(typeFilter).length !== 0 && <h3>{t('APP_INSTALL_FORM_GENERAL')}</h3>)}
      {info.dynamic_config && renderDynamicConfigForm()}
      {formFields.filter(typeFilter).map(renderField)}
      {guestDashboard && (
        <Controller
          control={control}
          name="isVisibleOnGuestDashboard"
          defaultValue={false}
          render={({ field: { onChange, value, ref, ...props } }) => (
            <Switch
              className="mb-3"
              disabled={info.force_expose}
              ref={ref}
              checked={value}
              onCheckedChange={onChange}
              {...props}
              label={t('APP_INSTALL_FORM_DISPLAY_ON_GUEST_DASHBOARD')}
            />
          )}
        />
      )}
      {info.exposable && <h3>{t('APP_INSTALL_FORM_REVERSE_PROXY')}</h3>}
      {info.exposable && renderExposeForm()}
      <Button loading={loading} type="submit" className="btn-success">
        {initialValues ? t('APP_INSTALL_FORM_SUBMIT_UPDATE') : t('APP_INSTALL_FORM_SUBMIT_INSTALL')}
      </Button>
      {initialValues && onReset && (
        <Button loading={status === 'stopping'} onClick={onClickReset} className="btn-danger ms-2">
          {t('APP_INSTALL_FORM_RESET')}
        </Button>
      )}
    </form>
  );
};
