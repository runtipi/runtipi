import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { useAppContext } from '@/context/app-context';
import type { AppInfo, FormField } from '@/types/app.types';
import clsx from 'clsx';
import type React from 'react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'react-tooltip';
import { validateAppConfig } from './form-validators';
import { InstallFormField } from './install-form-field';

interface IProps {
  formFields?: FormField[];
  onSubmit: (values: FormValues) => void;
  initialValues?: { [key: string]: unknown };
  info: AppInfo;
  loading?: boolean;
  formId: string;
}

export type FormValues = {
  exposed: boolean;
  exposedLocal: boolean;
  openPort: boolean;
  domain?: string;
  isVisibleOnGuestDashboard?: boolean;
  enableAuth: boolean;
  [key: string]: unknown;
};

const hiddenTypes = ['random'];
const typeFilter = (field: FormField) => !hiddenTypes.includes(field.type);

export const InstallForm: React.FC<IProps> = ({ formFields = [], info, onSubmit, initialValues, loading, formId }) => {
  const { t } = useTranslation();
  const { userSettings } = useAppContext();
  const { guestDashboard, localDomain, internalIp } = userSettings;

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

  useEffect(() => {
    if (info.force_expose) {
      setValue('exposed', true);
    }
  }, [info.force_expose, setValue]);

  useEffect(() => {
    if (initialValues && !isDirty) {
      for (const [key, value] of Object.entries(initialValues)) {
        setValue(key, value as string);
      }
    }
  }, [initialValues, isDirty, setValue]);

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
    );
  };

  const validate = (values: FormValues) => {
    const validationErrors = validateAppConfig(values, formFields);

    for (const [key, value] of Object.entries(validationErrors)) {
      if (value) {
        setError(key, { message: t(value.messageKey, value.params) });
      }
    }

    if (Object.keys(validationErrors).length === 0) {
      onSubmit(values);
    }
  };

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(validate)} id={formId}>
      {(guestDashboard || formFields.filter(typeFilter).length !== 0) && <h3>{t('APP_INSTALL_FORM_GENERAL')}</h3>}
      {formFields.filter(typeFilter).map(renderField)}
      {guestDashboard && (
        <Controller
          control={control}
          name="isVisibleOnGuestDashboard"
          defaultValue={false}
          render={({ field: { onChange, value, ref, ...props } }) => (
            <Switch
              className="mb-3"
              ref={ref}
              checked={value}
              onCheckedChange={onChange}
              {...props}
              label={t('APP_INSTALL_FORM_DISPLAY_ON_GUEST_DASHBOARD')}
            />
          )}
        />
      )}
      {Boolean(info.port) && (
        <>
          {(info.exposable || info.dynamic_config) && <h3>{t('APP_INSTALL_FORM_REVERSE_PROXY')}</h3>}
          {info.dynamic_config && renderDynamicConfigForm()}
          {info.exposable && renderExposeForm()}
        </>
      )}
    </form>
  );
};
