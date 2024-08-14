import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import type { Locale } from '@/shared/internationalization/locales';
import { IconAdjustmentsAlt, IconUser } from '@tabler/icons-react';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Tooltip } from 'react-tooltip';
import { TimeZoneSelector } from 'src/app/components/TimeZoneSelector/TimeZoneSelector';
import validator from 'validator';
import { LanguageSelector } from '../../../../components/LanguageSelector';

export type SettingsFormValues = {
  dnsIp?: string;
  internalIp?: string;
  appsRepoUrl?: string;
  domain?: string;
  appDataPath?: string;
  localDomain?: string;
  guestDashboard?: boolean;
  allowAutoThemes?: boolean;
  allowErrorMonitoring?: boolean;
  timeZone?: string;
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
  const t = useTranslations();

  const validateFields = (values: SettingsFormValues) => {
    const errors: { [K in keyof SettingsFormValues]?: string } = {};

    if (values.localDomain && !validator.isFQDN(values.localDomain)) {
      errors.localDomain = t('SETTINGS_GENERAL_INVALID_DOMAIN');
    }

    if (values.dnsIp && !validator.isIP(values.dnsIp)) {
      errors.dnsIp = t('SETTINGS_GENERAL_INVALID_IP');
    }

    if (values.internalIp && values.internalIp !== 'localhost' && !validator.isIP(values.internalIp)) {
      errors.internalIp = t('SETTINGS_GENERAL_INVALID_IP');
    }

    if (values.appsRepoUrl && !validator.isURL(values.appsRepoUrl)) {
      errors.appsRepoUrl = t('SETTINGS_GENERAL_INVALID_URL');
    }

    if (values.domain && !validator.isFQDN(values.domain)) {
      errors.domain = t('SETTINGS_GENERAL_INVALID_DOMAIN');
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
      for (const [key, value] of Object.entries(initalValues)) {
        setValue(key as keyof SettingsFormValues, value);
      }
    }
  }, [initalValues, isDirty, setValue]);

  useEffect(() => {
    if (submitErrors) {
      for (const [key, value] of Object.entries(submitErrors)) {
        setError(key as keyof SettingsFormValues, { message: value });
      }
    }
  }, [submitErrors, setError]);

  const validate = (values: SettingsFormValues) => {
    const validationErrors = validateFields(values);

    for (const [key, value] of Object.entries(validationErrors)) {
      if (value) {
        setError(key as keyof SettingsFormValues, { message: value });
      }
    }

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
        <h2 className="text-2xl font-bold">{t('SETTINGS_GENERAL_USER_SETTINGS')}</h2>
      </div>
      <LanguageSelector showLabel locale={currentLocale} />
      <form className="flex flex-col mt-2" onSubmit={handleSubmit(validate)}>
        <div className="d-flex">
          <IconAdjustmentsAlt className="me-2" />
          <h2 className="text-2xl font-bold">{t('SETTINGS_GENERAL_TITLE')}</h2>
        </div>
        <p className="mb-4">{t('SETTINGS_GENERAL_SUBTITLE')}</p>
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
                    {t('SETTINGS_GENERAL_GUEST_DASHBOARD')}
                    <Tooltip className="tooltip" anchorSelect=".guest-dashboard-hint">
                      {t('SETTINGS_GENERAL_GUEST_DASHBOARD_HINT')}
                    </Tooltip>
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
            name="allowErrorMonitoring"
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
                    {t('SETTINGS_GENERAL_ALLOW_ERROR_MONITORING')}
                    <Tooltip className="tooltip" anchorSelect=".allow-errors-hint">
                      {t('SETTINGS_GENERAL_ALLOW_ERROR_MONITORING_HINT')}
                    </Tooltip>
                    <span className={clsx('ms-1 form-help allow-errors-hint')}>?</span>
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
                    {t('SETTINGS_GENERAL_ALLOW_AUTO_THEMES')}
                    <Tooltip className="tooltip" anchorSelect=".allow-auto-themes-hint">
                      {t('SETTINGS_GENERAL_ALLOW_AUTO_THEMES_HINT')}
                    </Tooltip>
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
                {t('SETTINGS_GENERAL_DOMAIN_NAME')}
                <Tooltip className="tooltip" anchorSelect=".domain-name-hint">
                  {t('SETTINGS_GENERAL_DOMAIN_NAME_HINT')}
                </Tooltip>
                <span className={clsx('ms-1 form-help domain-name-hint')}>?</span>
              </>
            }
            error={errors.domain?.message}
            placeholder="example.com"
          />
        </div>
        <div className="mb-3">
          <Input {...register('dnsIp')} label={t('SETTINGS_GENERAL_DNS_IP')} error={errors.dnsIp?.message} placeholder="9.9.9.9" />
        </div>
        <div className="mb-3">
          <Input
            {...register('internalIp')}
            label={
              <>
                {t('SETTINGS_GENERAL_INTERNAL_IP')}
                <Tooltip className="tooltip" anchorSelect=".internal-ip-hint">
                  {t('SETTINGS_GENERAL_INTERNAL_IP_HINT')}
                </Tooltip>
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
                {t('SETTINGS_GENERAL_APPS_REPO')}
                <Tooltip className="tooltip" anchorSelect=".apps-repo-hint">
                  {t('SETTINGS_GENERAL_APPS_REPO_HINT')}
                </Tooltip>
                <span className={clsx('ms-1 form-help apps-repo-hint')}>?</span>
              </>
            }
            error={errors.appsRepoUrl?.message}
            placeholder="https://github.com/runtipi/runtipi-appstore"
          />
        </div>
        <div className="mb-3">
          <Input
            {...register('appDataPath')}
            label={
              <>
                {t('SETTINGS_GENERAL_STORAGE_PATH')}
                <Tooltip className="tooltip" anchorSelect=".storage-path-hint">
                  {t('SETTINGS_GENERAL_STORAGE_PATH_HINT')}
                </Tooltip>
                <span className={clsx('ms-1 form-help storage-path-hint')}>?</span>
              </>
            }
            error={errors.appDataPath?.message}
            placeholder={t('SETTINGS_GENERAL_STORAGE_PATH')}
          />
        </div>
        <div className="mb-3">
          <Controller
            control={control}
            name="timeZone"
            defaultValue="Etc/GMT"
            render={({ field: { onChange, value } }) => <TimeZoneSelector onChange={onChange} timeZone={value} />}
          />
        </div>
        <div className="mb-3">
          <Input
            {...register('localDomain')}
            label={
              <>
                {t('SETTINGS_GENERAL_LOCAL_DOMAIN')}
                <Tooltip className="tooltip" anchorSelect=".local-domain-hint">
                  {t('SETTINGS_GENERAL_LOCAL_DOMAIN_HINT')}
                </Tooltip>
                <span className={clsx('ms-1 form-help local-domain-hint')}>?</span>
              </>
            }
            error={errors.localDomain?.message}
            placeholder="tipi.lan"
          />
          <Button className="mt-2" onClick={downloadCertificate}>
            {t('SETTINGS_GENERAL_DOWNLOAD_CERTIFICATE')}
          </Button>
        </div>

        <Button loading={loading} type="submit" intent="success">
          {t('SETTINGS_GENERAL_SUBMIT')}
        </Button>
      </form>
    </>
  );
};
