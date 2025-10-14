import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

export const appFormSchema = type({
  port: 'number >= 1024 & number <= 65535?',
  exposed: 'boolean?',
  exposedLocal: 'boolean?',
  openPort: 'boolean = true',
  domain: 'string?',
  isVisibleOnGuestDashboard: 'boolean?',
  enableAuth: 'boolean?',
  localSubdomain: '/^[a-zA-Z0-9-]{1,63}$/?',
  maxBackups: 'number >= 0 & number <= 100?',
  skipEnv: 'boolean = false',
  skipPull: 'boolean = false',
  skipRun: 'boolean = false',
  '[string]': 'unknown',
});

const uninstallAppBodySchema = type({
  removeBackups: 'boolean',
});

const updateAppBodySchema = type({
  performBackup: 'boolean',
});

const lifecycleRequestSchema = type({
  requestId: 'string.uuid',
});

export class AppFormBody extends createArkDto(appFormSchema, { name: 'AppFormBody', input: true }) {}

export class UninstallAppBody extends createArkDto(uninstallAppBodySchema, { name: 'UninstallAppBody', input: true }) {}

export class UpdateAppBody extends createArkDto(updateAppBodySchema, { name: 'UpdateAppBody', input: true }) {}

export class LifecycleRequestDto extends createArkDto(lifecycleRequestSchema, { name: 'LifecycleRequestDto' }) {}
