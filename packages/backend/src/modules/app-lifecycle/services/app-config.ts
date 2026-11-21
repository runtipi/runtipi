import type { AppInfo } from '@runtipi/common/schemas';
import type { appFormSchema } from '../dto/app-lifecycle.dto';

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
  const allowedKeys = new Set([...SETTING_KEYS, ...(appInfo.form_fields ?? []).map((field) => field.env_variable)]);
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
