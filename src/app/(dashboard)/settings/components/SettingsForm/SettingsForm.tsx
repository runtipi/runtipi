import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { IconAdjustmentsAlt, IconUser } from '@tabler/icons-react';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Tooltip } from 'react-tooltip';
import validator from 'validator';
import { Locale } from '@/shared/internationalization/locales';
import { Switch } from '@/components/ui/Switch';
import { LanguageSelector } from '../../../../components/LanguageSelector';

export type SettingsFormValues = {
  dnsIp?: string;
  internalIp?: string;
  appsRepoUrl?: string;
  domain?: string;
  storagePath?: string;
  localDomain?: string;
  guestDashboard?: boolean;
  allowAutoThemes?: boolean;
};

interface IProps {
  currentLocale?: Locale;
  onSubmit: (values: SettingsFormValues) => void;
  initalValues?: Partial<SettingsFormValues>;
  loading?: boolean;
  submitErrors?: Record<string, string>;
}

export const SettingsForm = (props: IProps) => {
  const { onSubmit, initalValues, loading, currentLocale = 'en-US', submitErrors } = props;
  const t = useTranslations('settings.settings');

  const validateFields = (values: SettingsFormValues) => {
    const errors: { [K in keyof SettingsFormValues]?: string } = {};

    if (values.localDomain && !validator.isFQDN(values.localDomain)) {
      errors.localDomain = t('invalid-domain');
    }

    if (values.dnsIp && !validator.isIP(values.dnsIp)) {
      errors.dnsIp = t('invalid-ip');
    }

    if (values.internalIp && values.internalIp !== 'localhost' && !validator.isIP(values.internalIp)) {
      errors.internalIp = t('invalid-ip');
    }

    if (values.appsRepoUrl && !validator.isURL(values.appsRepoUrl)) {
      errors.appsRepoUrl = t('invalid-url');
    }

    if (values.domain && !validator.isFQDN(values.domain)) {
      errors.domain = t('invalid-domain');
    }

    return errors;
  };

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>();

  useEffect(() => {
    if (initalValues && !isDirty) {
      Object.entries(initalValues).forEach(([key, value]) => {
        setValue(key as keyof SettingsFormValues, value);
      });
    }
  }, [initalValues, isDirty, setValue]);

  useEffect(() => {
    if (submitErrors) {
      Object.entries(submitErrors).forEach(([key, value]) => {
        setError(key as keyof SettingsFormValues, { message: value });
      });
    }
  }, [submitErrors, setError]);

  const validate = (values: SettingsFormValues) => {
    const validationErrors = validateFields(values);

    Object.entries(validationErrors).forEach(([key, value]) => {
      if (value) {
        setError(key as keyof SettingsFormValues, { message: value });
      }
    });

    if (Object.keys(validationErrors).length === 0) {
      onSubmit(values);
    }
  };

  const downloadCertificate = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    window.open('/api/certificate');
  };

  return (
    <>
      <div className="d-flex">
        <IconUser className="me-2" />
        <h2 className="text-2xl font-bold">{t('user-settings-title')}</h2>
      </div>
      <LanguageSelector showLabel locale={currentLocale} />
      <form className="flex flex-col mt-2" onSubmit={handleSubmit(validate)}>
        <div className="d-flex">
          <IconAdjustmentsAlt className="me-2" />
          <h2 className="text-2xl font-bold">{t('title')}</h2>
        </div>
        <p className="mb-4">{t('subtitle')}</p>
        <div className="mb-3">
          <Controller
            control={control}
            name="guestDashboard"
            defaultValue={false}
            render={({ field: { onChange, value, ref, ...rest } }) => (
              <Switch
                className="mb-3"
                ref={ref}
                checked={value}
                onCheckedChange={onChange}
                {...rest}
                label={
                  <>
                    {t('guest-dashboard')}
                    <Tooltip anchorSelect=".guest-dashboard-hint">{t('guest-dashboard-hint')}</Tooltip>
                    <span className={clsx('ms-1 form-help guest-dashboard-hint')}>?</span>
                  </>
                }
              />
            )}
          />
        </div>
        <div className="mb-3">
          <Controller
            control={control}
            name="allowAutoThemes"
            defaultValue={false}
            render={({ field: { onChange, value, ref, ...rest } }) => (
              <Switch
                className="mb-3"
                ref={ref}
                checked={value}
                onCheckedChange={onChange}
                {...rest}
                label={
                  <>
                    {t('allow-auto-themes')}
                    <Tooltip anchorSelect=".allow-auto-themes-hint">{t('allow-auto-themes-hint')}</Tooltip>
                    <span className={clsx('ms-1 form-help allow-auto-themes-hint')}>?</span>
                  </>
                }
              />
            )}
          />
        </div>
        <div className="mb-3">
          <Input
            {...register('domain')}
            label={
              <>
                {t('domain-name')}
                <Tooltip anchorSelect=".domain-name-hint">{t('domain-name-hint')}</Tooltip>
                <span className={clsx('ms-1 form-help domain-name-hint')}>?</span>
              </>
            }
            error={errors.domain?.message}
            placeholder="example.com"
          />
        </div>
        <div className="mb-3">
          <Input {...register('dnsIp')} label={t('dns-ip')} error={errors.dnsIp?.message} placeholder="9.9.9.9" />
        </div>
        <div className="mb-3">
          <Input
            {...register('internalIp')}
            label={
              <>
                {t('internal-ip')}
                <Tooltip anchorSelect=".internal-ip-hint">{t('internal-ip-hint')}</Tooltip>
                <span className={clsx('ms-1 form-help internal-ip-hint')}>?</span>
              </>
            }
            error={errors.internalIp?.message}
            placeholder="192.168.1.100"
          />
        </div>
        <div className="mb-3">
          <Input
            {...register('appsRepoUrl')}
            label={
              <>
                {t('apps-repo')}
                <Tooltip anchorSelect=".apps-repo-hint">{t('apps-repo-hint')}</Tooltip>
                <span className={clsx('ms-1 form-help apps-repo-hint')}>?</span>
              </>
            }
            error={errors.appsRepoUrl?.message}
            placeholder="https://github.com/runtipi/runtipi-appstore"
          />
        </div>
        <div className="mb-3">
          <Input
            {...register('storagePath')}
            label={
              <>
                {t('storage-path')}
                <Tooltip anchorSelect=".storage-path-hint">{t('storage-path-hint')}</Tooltip>
                <span className={clsx('ms-1 form-help storage-path-hint')}>?</span>
              </>
            }
            error={errors.storagePath?.message}
            placeholder={t('storage-path')}
          />
        </div>
        <div className="mb-3">
          <Input
            {...register('localDomain')}
            label={
              <>
                {t('local-domain')}
                <Tooltip anchorSelect=".local-domain-hint">{t('local-domain-hint')}</Tooltip>
                <span className={clsx('ms-1 form-help local-domain-hint')}>?</span>
              </>
            }
            error={errors.localDomain?.message}
            placeholder="tipi.lan"
          />
          <Button className="mt-2" onClick={downloadCertificate}>
            {t('download-certificate')}
          </Button>
        </div>
        <Button loading={loading} type="submit" className="btn-success">
          {t('submit')}
        </Button>
      </form>
    </>
  );
};
