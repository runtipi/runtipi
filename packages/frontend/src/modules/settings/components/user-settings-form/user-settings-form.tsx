import { LanguageSelector } from '@/components/language-selector/language-selector';
import { TimeZoneSuspense } from '@/components/timezone-selector/timezone-selector';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import type { Locale } from '@/lib/i18n/locales';
import { IconAdjustmentsAlt, IconAdjustmentsCode, IconInfoCircle, IconUser } from '@tabler/icons-react';
import clsx from 'clsx';
import type React from 'react';
import { Suspense, lazy, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'react-tooltip';
import validator from 'validator';
import { z } from 'zod';
import { AdvancedSettingsModal } from '../advanced-settings-modal/advanced-settings-modal';
import './user-settings-form.css';
import { Alert, AlertDescription, AlertHeading, AlertIcon } from '@/components/ui/Alert/Alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { type ThemeBase, ThemeBaseSelector } from '../base-theme-selector/base-theme-selector';
import { ColorSelector, ThemeColor } from '../color-selector/color-selector';

const TimeZoneSelector = lazy(() =>
  import('@/components/timezone-selector/timezone-selector').then((module) => ({ default: module.TimeZoneSelector })),
);

const LOG_LEVEL_ENUM = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
} as const;
type LogLevel = (typeof LOG_LEVEL_ENUM)[keyof typeof LOG_LEVEL_ENUM];

const settingsSchema = z.object({
  appsRepoUrl: z.string().optional(),
  localDomain: z.string().optional(),
  guestDashboard: z.boolean().optional(),
  allowAutoThemes: z.boolean().optional(),
  allowErrorMonitoring: z.boolean().optional(),
  timeZone: z.string().optional(),
  advancedSettings: z.boolean().optional(),
  internalIp: z.string().ip().optional(),
  listenIp: z.string().ip().optional(),
  port: z.number().min(1).max(65535).optional(),
  sslPort: z.number().min(1).max(65535).optional(),
  eventsTimeout: z.coerce.number().int().min(1).optional(),
  persistTraefikConfig: z.boolean().optional(),
  domain: z.string().optional(),
  appDataPath: z.string().optional(),
  forwardAuthUrl: z.string().url().optional(),
  logLevel: z.nativeEnum(LOG_LEVEL_ENUM).optional(),
  themeColor: z.nativeEnum(ThemeColor).optional(),
});

export type SettingsFormValues = {
  appsRepoUrl?: string;
  localDomain?: string;
  guestDashboard?: boolean;
  allowAutoThemes?: boolean;
  allowErrorMonitoring?: boolean;
  timeZone?: string;
  advancedSettings?: boolean;
  internalIp?: string;
  listenIp?: string;
  port?: number;
  sslPort?: number;
  eventsTimeout?: number;
  persistTraefikConfig?: boolean;
  domain?: string;
  appDataPath?: string;
  forwardAuthUrl?: string;
  logLevel?: LogLevel;
  themeColor?: ThemeColor;
};

interface IProps {
  currentLocale?: Locale;
  currentBaseTheme?: ThemeBase;
  onSubmit: (values: SettingsFormValues) => void;
  initialValues?: Partial<SettingsFormValues>;
  loading?: boolean;
  submitErrors?: Record<string, string>;
}

export const UserSettingsForm = (props: IProps) => {
  const { onSubmit, initialValues, loading, currentLocale = 'en-US', submitErrors, currentBaseTheme = 'gray' } = props;
  const { t } = useTranslation();
  const advancedSettingsDisclosure = useDisclosure();

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
    formState: { errors, isDirty },
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
      {isDirty && (
        <Alert variant="info" className="fade-in">
          <AlertIcon>
            <IconInfoCircle stroke={2} />
          </AlertIcon>
          <div>
            <AlertHeading>{t('SETTINGS_GENERAL_SAVE_ALERT_TITLE')}</AlertHeading>
            <AlertDescription>{t('SETTINGS_GENERAL_SAVE_ALERT_SUBTITLE')}</AlertDescription>
          </div>
        </Alert>
      )}
      <div className="d-flex mb-2">
        <IconUser className="me-2" />
        <h2 className="text-2xl font-bold mb-0">{t('SETTINGS_GENERAL_USER_SETTINGS')}</h2>
      </div>
      <LanguageSelector showLabel locale={currentLocale} />
      <ThemeBaseSelector />
      <ColorSelector label={t('SETTINGS_GENERAL_PRIMARY_COLOR')} />
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
          <Controller
            control={control}
            name="advancedSettings"
            defaultValue={false}
            render={({ field: { onChange, value, ref, ...rest } }) => (
              <div>
                <AdvancedSettingsModal
                  onEnable={() => {
                    advancedSettingsDisclosure.close();
                    onChange(true);
                  }}
                  advancedSettingsDisclosure={advancedSettingsDisclosure}
                />
                <Switch
                  className="mb-3"
                  ref={ref}
                  checked={value}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      advancedSettingsDisclosure.open();
                    } else {
                      onChange(false);
                    }
                  }}
                  {...rest}
                  label={
                    <>
                      Advanced Settings
                      <Tooltip className="tooltip" anchorSelect=".advanced-settings-hint">
                        Enable advanced settings for more control over your instance.
                      </Tooltip>
                      <span className={clsx('ms-1 form-help advanced-settings-hint')}>?</span>
                    </>
                  }
                />
              </div>
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
            placeholder="tipi.local"
            disabled={initialValues?.advancedSettings === false}
          />
          <Button className="mt-2 mb-2" onClick={downloadCertificate}>
            {t('SETTINGS_GENERAL_DOWNLOAD_CERTIFICATE')}
          </Button>
        </div>
        {initialValues?.advancedSettings && (
          <div>
            <div className="d-flex mb-2">
              <IconAdjustmentsCode className="me-2" />
              <h2 className="text-2xl font-bold mb-0">{t('SETTINGS_GENERAL_ADVANCED_SETTINGS_TITLE')}</h2>
            </div>
            <p className="mb-4">{t('SETTINGS_GENERAL_ADVANCED_SETTINGS_SUBTITLE')}</p>
            <div className="mb-3">
              <Controller
                control={control}
                name="persistTraefikConfig"
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
                        {t('SETTINGS_GENERAL_PERSIST_TRAEFIK_CONFIG')}
                        <Tooltip className="tooltip" anchorSelect=".persist-traefik-config-hint">
                          {t(
                            'Persist the Traefik configuration folder throughout restarts. This will allow you to customize the Traefik configuration.',
                          )}
                        </Tooltip>
                        <span className={clsx('ms-1 form-help persist-traefik-config-hint')}>?</span>
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
                    {t('SETTINGS_GENERAL_DOMAIN')}
                    <Tooltip className="tooltip" anchorSelect=".domain-hint">
                      {t('SETTINGS_GENERAL_DOMAIN_HINT')}
                    </Tooltip>
                    <span className={clsx('ms-1 form-help domain-hint')}>?</span>
                  </>
                }
                error={errors.domain?.message}
                placeholder="example.com"
              />
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
                placeholder="192.168.1.1"
              />
            </div>
            <div className="mb-3">
              <Input
                {...register('listenIp')}
                label={
                  <>
                    {t('SETTINGS_GENERAL_LISTEN_IP')}
                    <Tooltip className="tooltip" anchorSelect=".listen-ip-hint">
                      {t('SETTINGS_GENERAL_LISTEN_IP_HINT')}
                    </Tooltip>
                    <span className={clsx('ms-1 form-help listen-ip-hint')}>?</span>
                  </>
                }
                error={errors.listenIp?.message}
                placeholder="0.0.0.0"
              />
            </div>
            <div className="mb-3">
              <Input
                {...register('port')}
                label={
                  <>
                    {t('SETTINGS_GENERAL_PORT')}
                    <Tooltip className="tooltip" anchorSelect=".port-hint">
                      {t('SETTINGS_GENERAL_PORT_HINT')}
                    </Tooltip>
                    <span className={clsx('ms-1 form-help port-hint')}>?</span>
                  </>
                }
                error={errors.port?.message}
                placeholder="80"
              />
            </div>
            <div className="mb-3">
              <Input
                {...register('sslPort')}
                label={
                  <>
                    {t('SETTINGS_GENERAL_SSL_PORT')}
                    <Tooltip className="tooltip" anchorSelect=".sslPort-hint">
                      {t('SETTINGS_GENERAL_SSL_PORT_HINT')}
                    </Tooltip>
                    <span className={clsx('ms-1 form-help sslPort-hint')}>?</span>
                  </>
                }
                error={errors.sslPort?.message}
                placeholder="443"
              />
            </div>
            <div className="mb-3">
              <Input
                {...register('eventsTimeout')}
                label={
                  <>
                    {t('SETTINGS_GENERAL_EVENTS_TIMEOUT')}
                    <Tooltip className="tooltip" anchorSelect=".events-timeout-hint">
                      {t('SETTINGS_GENERAL_EVENTS_TIMEOUT_HINT')}
                    </Tooltip>
                    <span className={clsx('ms-1 form-help events-timeout-hint')}>?</span>
                  </>
                }
                error={errors.eventsTimeout?.message}
                placeholder="5"
              />
            </div>
            <div className="mb-3">
              <Input
                {...register('appDataPath')}
                label={
                  <>
                    {t('SETTINGS_GENERAL_APP_DATA_PATH')}
                    <Tooltip className="tooltip" anchorSelect=".app-data-path-hint">
                      {t('SETTINGS_GENERAL_APP_DATA_PATH_HINT')}
                    </Tooltip>
                    <span className={clsx('ms-1 form-help app-data-path-hint')}>?</span>
                  </>
                }
                error={errors.appDataPath?.message}
                placeholder="/path/to/app/data"
              />
            </div>
            <div className="mb-3">
              <Input
                {...register('forwardAuthUrl')}
                label={
                  <>
                    {t('SETTINGS_GENERAL_FORWARD_AUTH_URL')}
                    <Tooltip className="tooltip" anchorSelect=".forward-auth-url-hint">
                      {t('SETTINGS_GENERAL_FORWARD_AUTH_URL_HINT')}
                    </Tooltip>
                    <span className={clsx('ms-1 form-help forward-auth-url-hint')}>?</span>
                  </>
                }
                error={errors.forwardAuthUrl?.message}
                placeholder="https://auth.example.com"
              />
            </div>
            <div className="mb-3">
              <Controller
                control={control}
                name="logLevel"
                defaultValue="info"
                render={({ field: { onChange, value } }) => (
                  <Select value={value} defaultValue="info" onValueChange={onChange}>
                    <SelectTrigger className="mb-3" name="logLevel" label={t('SETTINGS_GENERAL_LOG_LEVEL')}>
                      <SelectValue placeholder="Log level" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(LOG_LEVEL_ENUM).map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        )}
        <Button loading={loading} type="submit" intent="success">
          {t('SETTINGS_GENERAL_SUBMIT')}
        </Button>
      </form>
    </>
  );
};
