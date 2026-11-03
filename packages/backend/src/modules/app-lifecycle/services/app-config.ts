import type { AppInfo } from '@runtipi/common/schemas';
import type { appFormSchema } from '../dto/app-lifecycle.dto';

/**
 * Keys of the app form that belong to Runtipi rather than to the app's
 * `form_fields`. They are kept in `app.config` between requests, so they must
 * survive the filtering below.
 */
const SETTING_KEYS = new Set([
  'port',
  'exposed',
  'exposedLocal',
  'openPort',
  'domain',
  'isVisibleOnGuestDashboard',
  'enableAuth',
  'localSubdomain',
  'maxBackups',
  'skipEnv',
  'skipPull',
  'skipRun',
  'forcePull',
]);

export const getAppConfigUpdate = (appInfo: AppInfo, form: typeof appFormSchema.infer) => {
  // Only keep what the app still declares. Values for fields that were dropped
  // from the store's form_fields would otherwise stay in the database forever,
  // plain-text password fields included (#2711).
  const allowedKeys = new Set([
    ...SETTING_KEYS,
    ...(appInfo.form_fields ?? []).map((field) => field.env_variable),
  ]);
  const config = Object.fromEntries(Object.entries(form).filter(([key]) => allowedKeys.has(key)));

  return {
    exposed: form.exposed ?? false,
    exposedLocal: form.exposedLocal ?? false,
    openPort: form.openPort,
    port: form.port ?? appInfo.port,
    domain: form.domain ?? null,
    localSubdomain: form.localSubdomain ?? null,
    config,
    isVisibleOnGuestDashboard: form.isVisibleOnGuestDashboard ?? false,
    enableAuth: form.enableAuth ?? false,
    maxBackups: form.maxBackups ?? null,
  };
};
