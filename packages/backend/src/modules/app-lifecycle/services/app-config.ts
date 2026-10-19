import type { AppInfo } from '@runtipi/common/schemas';
import type { appFormSchema } from '../dto/app-lifecycle.dto';

export const getAppConfigUpdate = (appInfo: AppInfo, form: typeof appFormSchema.infer) => ({
  exposed: form.exposed ?? false,
  exposedLocal: form.exposedLocal ?? false,
  openPort: form.openPort,
  port: form.port ?? appInfo.port,
  domain: form.domain ?? null,
  localSubdomain: form.localSubdomain ?? null,
  config: form,
  isVisibleOnGuestDashboard: form.isVisibleOnGuestDashboard ?? false,
  enableAuth: form.enableAuth ?? false,
  maxBackups: form.maxBackups ?? null,
});
