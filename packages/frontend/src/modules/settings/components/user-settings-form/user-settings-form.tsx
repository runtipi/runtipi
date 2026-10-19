import { useUserContext } from '@/context/user-context';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import { type Locale, locales, toSupportedLocale } from '@/lib/i18n/locales';
import { IconArrowUpRight, IconCertificate } from '@tabler/icons-react';
import { type } from 'arktype';
import i18next from 'i18next';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import validator from 'validator';
import { AdvancedSettingsModal } from '../advanced-settings-modal/advanced-settings-modal';
import { THEME_COLOR_ENUM } from '../color-selector/color-selector';
import { AccentSwatches, RtSwitch, SettingRow, SettingsPanel } from '../settings-ui/settings-ui';
import { THEME_BASE_ENUM } from '../theme-base-selector/theme-base-selector';

const TimeZoneField = lazy(() =>
  import('@/components/timezone-selector/timezone-field').then((module) => ({
    default: module.TimeZoneField,
  })),
);

const LOG_LEVEL_ENUM = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
} as const;
type LogLevel = (typeof LOG_LEVEL_ENUM)[keyof typeof LOG_LEVEL_ENUM];

const settingsSchema = type({
  appsRepoUrl: 'string?',
  localDomain: 'string?',
  guestDashboard: 'boolean?',
  allowAutoThemes: 'boolean?',
  allowErrorMonitoring: 'boolean?',
  timeZone: 'string?',
  advancedSettings: 'boolean?',
  internalIp: 'string.ip.v4?',
  listenIp: 'string.ip.v4?',
  port: '1 <= number <= 65535?',
  sslPort: '1 <= number <= 65535?',
  eventsTimeout: 'number.integer >= 1?',
  maxBackups: '0 <= number.integer <= 100?',
  persistTraefikConfig: 'boolean?',
  domain: 'string?',
  appDataPath: 'string?',
  forwardAuthUrl: 'string.url?',
  logLevel: type.enumerated(...Object.values(LOG_LEVEL_ENUM)).optional(),
  themeColor: type.enumerated(...Object.values(THEME_COLOR_ENUM)).optional(),
  themeBase: type.enumerated(...Object.values(THEME_BASE_ENUM)).optional(),
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
  maxBackups?: number;
  persistTraefikConfig?: boolean;
  domain?: string;
  appDataPath?: string;
  forwardAuthUrl?: string;
  logLevel?: LogLevel;
  themeColor?: string;
  themeBase?: string;
};

interface IProps {
  currentLocale?: Locale;
  onSubmit: (values: SettingsFormValues) => void;
  initialValues?: Partial<SettingsFormValues>;
  loading?: boolean;
  submitErrors?: Record<string, string>;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Map the detected language (e.g. "en", "en-US@posix") to one of the supported locales.
 */
// Theme changes are previewed right away and reverted when discarding
const previewTheme = (key: 'bsThemeBase' | 'bsThemePrimary', value?: string) => {
  if (value) document.body.dataset[key] = value;
};

export const UserSettingsForm = (props: IProps) => {
  const { onSubmit, initialValues, loading, currentLocale = 'en-US', submitErrors } = props;
  const { t } = useTranslation();
  const advancedSettingsDisclosure = useDisclosure();
  const [locale, setLocale] = useState<Locale>(toSupportedLocale(currentLocale));

  const {
    register,
    handleSubmit,
    setError,
    control,
    reset,
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
    const validationErrors: { [K in keyof SettingsFormValues]?: string } = {};

    if (values.localDomain && !validator.isFQDN(values.localDomain)) {
      validationErrors.localDomain = t('SETTINGS_GENERAL_INVALID_DOMAIN');
    }

    if (values.appsRepoUrl && !validator.isURL(values.appsRepoUrl)) {
      validationErrors.appsRepoUrl = t('SETTINGS_GENERAL_INVALID_URL');
    }

    for (const [key, value] of Object.entries(validationErrors)) {
      if (value) {
        setError(key as keyof SettingsFormValues, { message: value });
      }
    }

    if (Object.keys(validationErrors).length === 0) {
      const result = settingsSchema(values);
      if (result instanceof type.errors) {
        for (const [path, issue] of Object.entries(result.byPath ?? {})) {
          setError(path as keyof SettingsFormValues, { message: issue.message });
        }
        return;
      }

      onSubmit(result as SettingsFormValues);
    }
  };

  // Leaving the page without saving drops the preview, back to the saved theme
  const { themeBase: savedBase, themeColor: savedColor } = useUserContext();
  const savedTheme = useRef({ base: savedBase, color: savedColor });
  savedTheme.current = { base: savedBase, color: savedColor };
  useEffect(
    () => () => {
      previewTheme('bsThemeBase', savedTheme.current.base);
      previewTheme('bsThemePrimary', savedTheme.current.color);
    },
    [],
  );

  const discard = () => {
    previewTheme('bsThemeBase', initialValues?.themeBase);
    previewTheme('bsThemePrimary', initialValues?.themeColor);
    reset(initialValues);
  };

  const onLocaleChange = (newLocale: Locale) => {
    i18next.changeLanguage(newLocale);
    setLocale(newLocale);
  };

  const advanced = initialValues?.advancedSettings;

  const textRow = (
    name: 'appsRepoUrl' | 'localDomain' | 'domain' | 'internalIp' | 'listenIp' | 'appDataPath' | 'forwardAuthUrl',
    label: string,
    description: string,
    placeholder: string,
    options: { mono?: boolean; disabled?: boolean } = {},
  ) => (
    <SettingRow label={label} description={description} htmlFor={`setting-${name}`} error={errors[name]?.message}>
      <input
        id={`setting-${name}`}
        className={`rt-field${options.mono ? ' rt-mono' : ''}`}
        placeholder={placeholder}
        disabled={options.disabled}
        {...register(name)}
      />
    </SettingRow>
  );

  const numberRow = (name: 'port' | 'sslPort' | 'eventsTimeout' | 'maxBackups', label: string, description: string, placeholder: string) => (
    <SettingRow label={label} description={description} htmlFor={`setting-${name}`} error={errors[name]?.message}>
      <input
        id={`setting-${name}`}
        className="rt-field rt-mono"
        type="number"
        placeholder={placeholder}
        {...register(name, { valueAsNumber: true, required: name === 'eventsTimeout' || name === 'maxBackups' })}
      />
    </SettingRow>
  );

  const switchRow = (
    name: 'allowAutoThemes' | 'guestDashboard' | 'allowErrorMonitoring' | 'persistTraefikConfig',
    label: string,
    description: string,
  ) => (
    <SettingRow label={label} description={description} inline>
      <Controller
        control={control}
        name={name}
        defaultValue={false}
        render={({ field: { onChange, value } }) => <RtSwitch checked={value} onChange={onChange} label={label} />}
      />
    </SettingRow>
  );

  return (
    <form className="rt-settings-stack" onSubmit={handleSubmit(validate)}>
      <SettingsPanel title={t('SETTINGS_APPEARANCE_TITLE')} description={t('SETTINGS_APPEARANCE_SUBTITLE')}>
        <SettingRow
          label={t('SETTINGS_GENERAL_LANGUAGE')}
          htmlFor="setting-language"
          description={
            <a href="https://crowdin.com/project/runtipi" target="_blank" rel="noreferrer">
              {t('SETTINGS_GENERAL_LANGUAGE_HELP_TRANSLATE')}
              <IconArrowUpRight size={13} stroke={1.8} aria-hidden="true" />
            </a>
          }
        >
          <select id="setting-language" className="rt-field" value={locale} onChange={(e) => onLocaleChange(e.target.value as Locale)}>
            {Object.keys(locales).map((key) => (
              <option key={key} value={key}>
                {locales[key as Locale]}
              </option>
            ))}
          </select>
        </SettingRow>
        <SettingRow label={t('SETTINGS_GENERAL_BASE_THEME')} description={t('SETTINGS_BASE_THEME_HINT')} htmlFor="setting-themeBase">
          <Controller
            control={control}
            name="themeBase"
            render={({ field: { onChange, value } }) => (
              <select
                id="setting-themeBase"
                className="rt-field"
                value={value}
                onChange={(e) => {
                  previewTheme('bsThemeBase', e.target.value);
                  onChange(e.target.value);
                }}
              >
                {Object.values(THEME_BASE_ENUM).map((base) => (
                  <option key={base} value={base}>
                    {capitalize(base)}
                  </option>
                ))}
              </select>
            )}
          />
        </SettingRow>
        <SettingRow label={t('SETTINGS_ACCENT_COLOR')} description={t('SETTINGS_ACCENT_COLOR_HINT')}>
          <Controller
            control={control}
            name="themeColor"
            render={({ field: { onChange, value } }) => (
              <AccentSwatches
                label={t('SETTINGS_ACCENT_COLOR')}
                value={value}
                onChange={(color) => {
                  previewTheme('bsThemePrimary', color);
                  onChange(color);
                }}
              />
            )}
          />
        </SettingRow>
        {switchRow('allowAutoThemes', t('SETTINGS_GENERAL_ALLOW_AUTO_THEMES'), t('SETTINGS_GENERAL_ALLOW_AUTO_THEMES_HINT'))}
      </SettingsPanel>

      <SettingsPanel title={t('SETTINGS_INSTANCE_TITLE')} description={t('SETTINGS_INSTANCE_SUBTITLE')}>
        {switchRow('guestDashboard', t('SETTINGS_GENERAL_GUEST_DASHBOARD'), t('SETTINGS_GENERAL_GUEST_DASHBOARD_HINT'))}
        {switchRow('allowErrorMonitoring', t('SETTINGS_GENERAL_ALLOW_ERROR_MONITORING'), t('SETTINGS_GENERAL_ALLOW_ERROR_MONITORING_HINT'))}
        <SettingRow label={t('SETTINGS_GENERAL_ADVANCED_SETTINGS_TITLE')} description={t('SETTINGS_GENERAL_ADVANCED_SETTINGS_SUBTITLE')} inline>
          <Controller
            control={control}
            name="advancedSettings"
            defaultValue={false}
            render={({ field: { onChange, value } }) => (
              <>
                <AdvancedSettingsModal
                  onEnable={() => {
                    advancedSettingsDisclosure.close();
                    onChange(true);
                  }}
                  advancedSettingsDisclosure={advancedSettingsDisclosure}
                />
                <RtSwitch
                  checked={value}
                  label={t('SETTINGS_GENERAL_ADVANCED_SETTINGS_TITLE')}
                  onChange={(checked) => (checked ? advancedSettingsDisclosure.open() : onChange(false))}
                />
              </>
            )}
          />
        </SettingRow>
        {textRow(
          'appsRepoUrl',
          t('SETTINGS_GENERAL_APPS_REPO'),
          t('SETTINGS_GENERAL_APPS_REPO_HINT'),
          'https://github.com/runtipi/runtipi-appstore',
          {
            mono: true,
          },
        )}
        <SettingRow label={t('TIMEZONE_SELECTOR_LABEL')} description={t('SETTINGS_TIMEZONE_HINT')} htmlFor="setting-timezone">
          <Controller
            control={control}
            name="timeZone"
            defaultValue="Etc/GMT"
            render={({ field: { onChange, value } }) => (
              <Suspense fallback={<select id="setting-timezone" className="rt-field" disabled />}>
                <TimeZoneField id="setting-timezone" timeZone={value} onChange={onChange} />
              </Suspense>
            )}
          />
        </SettingRow>
        <SettingRow
          label={t('SETTINGS_GENERAL_LOCAL_DOMAIN')}
          description={t('SETTINGS_GENERAL_LOCAL_DOMAIN_HINT')}
          htmlFor="setting-localDomain"
          error={errors.localDomain?.message}
        >
          <input
            id="setting-localDomain"
            className="rt-field rt-mono"
            placeholder="tipi.lan"
            disabled={advanced === false}
            {...register('localDomain')}
          />
          <button type="button" className="rt-btn rt-btn--sm" onClick={() => window.open('/api/system/certificate')}>
            <IconCertificate size={15} stroke={1.8} aria-hidden="true" />
            {t('SETTINGS_GENERAL_DOWNLOAD_CERTIFICATE')}
          </button>
        </SettingRow>
      </SettingsPanel>

      {advanced && (
        <SettingsPanel title={t('SETTINGS_GENERAL_ADVANCED_SETTINGS_TITLE')} description={t('SETTINGS_GENERAL_ADVANCED_SETTINGS_SUBTITLE')}>
          {switchRow('persistTraefikConfig', t('SETTINGS_GENERAL_PERSIST_TRAEFIK_CONFIG'), t('SETTINGS_GENERAL_PERSIST_TRAEFIK_CONFIG_HINT'))}
          {textRow('domain', t('SETTINGS_GENERAL_DOMAIN'), t('SETTINGS_GENERAL_DOMAIN_HINT'), 'example.com', { mono: true })}
          {textRow('internalIp', t('SETTINGS_GENERAL_INTERNAL_IP'), t('SETTINGS_GENERAL_INTERNAL_IP_HINT'), '192.168.1.1', { mono: true })}
          {textRow('listenIp', t('SETTINGS_GENERAL_LISTEN_IP'), t('SETTINGS_GENERAL_LISTEN_IP_HINT'), '0.0.0.0', { mono: true })}
          {numberRow('port', t('SETTINGS_GENERAL_PORT'), t('SETTINGS_GENERAL_PORT_HINT'), '80')}
          {numberRow('sslPort', t('SETTINGS_GENERAL_SSL_PORT'), t('SETTINGS_GENERAL_SSL_PORT_HINT'), '443')}
          {numberRow('eventsTimeout', t('SETTINGS_GENERAL_EVENTS_TIMEOUT'), t('SETTINGS_GENERAL_EVENTS_TIMEOUT_HINT'), '5')}
          {numberRow('maxBackups', t('SETTINGS_GENERAL_MAX_BACKUPS'), t('SETTINGS_GENERAL_MAX_BACKUPS_HINT'), '5')}
          {textRow('appDataPath', t('SETTINGS_GENERAL_APP_DATA_PATH'), t('SETTINGS_GENERAL_APP_DATA_PATH_HINT'), '/path/to/app/data', { mono: true })}
          {textRow(
            'forwardAuthUrl',
            t('SETTINGS_GENERAL_FORWARD_AUTH_URL'),
            t('SETTINGS_GENERAL_FORWARD_AUTH_URL_HINT'),
            'https://auth.example.com',
            {
              mono: true,
            },
          )}
          <SettingRow label={t('SETTINGS_GENERAL_LOG_LEVEL')} htmlFor="setting-logLevel">
            <select id="setting-logLevel" className="rt-field" {...register('logLevel')}>
              {Object.values(LOG_LEVEL_ENUM).map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </SettingRow>
        </SettingsPanel>
      )}

      <div className="rt-set-footer">
        {isDirty && <span className="rt-set-footer__hint">{t('SETTINGS_GENERAL_SAVE_ALERT_SUBTITLE')}</span>}
        <button type="button" className="rt-btn" onClick={discard} disabled={!isDirty || loading}>
          {t('SETTINGS_DISCARD')}
        </button>
        <button type="submit" className="rt-btn rt-btn--primary" disabled={loading}>
          {t('SETTINGS_SAVE_CHANGES')}
        </button>
      </div>
    </form>
  );
};
