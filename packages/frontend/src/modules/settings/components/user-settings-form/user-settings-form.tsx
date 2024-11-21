import { LanguageSelector } from '@/components/language-selector/language-selector';
import { TimeZoneSuspense } from '@/components/timezone-selector/timezone-selector';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import type { Locale } from '@/lib/i18n/locales';
import { IconAdjustmentsAlt, IconUser } from '@tabler/icons-react';
import clsx from 'clsx';
import type React from 'react';
import { Suspense, lazy, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'react-tooltip';
import validator from 'validator';
import { z } from 'zod';

const TimeZoneSelector = lazy(() =>
  import('@/components/timezone-selector/timezone-selector').then((module) => ({ default: module.TimeZoneSelector })),
);

const settingsSchema = z.object({
  appsRepoUrl: z.string().optional(),
  localDomain: z.string().optional(),
  guestDashboard: z.boolean().optional(),
  allowAutoThemes: z.boolean().optional(),
  allowErrorMonitoring: z.boolean().optional(),
  timeZone: z.string().optional(),
});

export type SettingsFormValues = {
  appsRepoUrl?: string;
  localDomain?: string;
  guestDashboard?: boolean;
  allowAutoThemes?: boolean;
  allowErrorMonitoring?: boolean;
  timeZone?: string;
};

interface IProps {
  currentLocale?: Locale;
  onSubmit: (values: SettingsFormValues) => void;
  initialValues?: Partial<SettingsFormValues>;
  loading?: boolean;
  submitErrors?: Record<string, string>;
}

export const UserSettingsForm = (props: IProps) => {
  const { onSubmit, initialValues, loading, currentLocale = 'en-US', submitErrors } = props;
  const { t } = useTranslation();

  const validateFields = (values: SettingsFormValues) => {
    const errors: { [K in keyof SettingsFormValues]?: string } = {};

    if (values.localDomain && !validator.isFQDN(values.localDomain)) {
      errors.localDomain = t('SETTINGS_GENERAL_INVALID_DOMAIN');
    }

    if (values.appsRepoUrl && !validator.isURL(values.appsRepoUrl)) {
      errors.appsRepoUrl = t('SETTINGS_GENERAL_INVALID_URL');
    }

    return errors;
  };

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<SettingsFormValues>({ values: initialValues });

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
      onSubmit(settingsSchema.parse(values));
    }
  };

  const downloadCertificate = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    window.open('/api/system/certificate');
  };

  return (
    <>
      <div className="d-flex mb-2">
        <IconUser className="me-2" />
        <h2 className="text-2xl font-bold mb-0">{t('SETTINGS_GENERAL_USER_SETTINGS')}</h2>
      </div>
      <LanguageSelector showLabel locale={currentLocale} />
      <form className="flex flex-col mt-2" onSubmit={handleSubmit(validate)}>
        <div className="d-flex mb-2">
          <IconAdjustmentsAlt className="me-2" />
          <h2 className="text-2xl font-bold mb-0">{t('SETTINGS_GENERAL_TITLE')}</h2>
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
        <div>
          <Controller
            control={control}
            name="timeZone"
            defaultValue="Etc/GMT"
            render={({ field: { onChange, value } }) => (
              <Suspense fallback={<TimeZoneSuspense />}>
                <TimeZoneSelector onChange={onChange} timeZone={value} />
              </Suspense>
            )}
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
            disabled={true}
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
