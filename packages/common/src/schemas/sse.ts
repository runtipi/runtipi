import { type } from 'arktype';

export type Topic = 'app' | 'app-logs' | 'runtipi-logs';

const appUrnSchema = type('string').narrow((v, ctx) => (v.split(':').length === 2 ? true : ctx.mustBe('a valid app URN')));

export const APP_EVENT_TYPES = {
  STATUS_CHANGE: 'status_change',
  INSTALL_SUCCESS: 'install_success',
  INSTALL_ERROR: 'install_error',
  UNINSTALL_SUCCESS: 'uninstall_success',
  UNINSTALL_ERROR: 'uninstall_error',
  RESET_SUCCESS: 'reset_success',
  RESET_ERROR: 'reset_error',
  UPDATE_SUCCESS: 'update_success',
  UPDATE_ERROR: 'update_error',
  START_SUCCESS: 'start_success',
  START_ERROR: 'start_error',
  STOP_SUCCESS: 'stop_success',
  STOP_ERROR: 'stop_error',
  RESTART_SUCCESS: 'restart_success',
  RESTART_ERROR: 'restart_error',
  GENERATE_ENV_SUCCESS: 'generate_env_success',
  GENERATE_ENV_ERROR: 'generate_env_error',
  BACKUP_SUCCESS: 'backup_success',
  BACKUP_ERROR: 'backup_error',
  RESTORE_SUCCESS: 'restore_success',
  RESTORE_ERROR: 'restore_error',
} as const;

export const APP_STATUS_TYPES = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  STARTING: 'starting',
  STOPPING: 'stopping',
  UPDATING: 'updating',
  MISSING: 'missing',
  INSTALLING: 'installing',
  UNINSTALLING: 'uninstalling',
  RESETTING: 'resetting',
  RESTARTING: 'restarting',
  BACKING_UP: 'backing_up',
  RESTORING: 'restoring',
} as const;

export const sseSchema = type.or(
  type({
    topic: type.unit('app'),
    data: {
      event: type.valueOf(APP_EVENT_TYPES),
      appUrn: appUrnSchema,
      appStatus: type.valueOf(APP_STATUS_TYPES).optional(),
      error: 'string?',
    },
  }),
  type({
    topic: type.unit('app-logs'),
    data: {
      event: type("'newLogs' | 'stopLogs'"),
      appUrn: appUrnSchema,
      lines: 'string[]?',
    },
  }),
  type({
    topic: type.unit('runtipi-logs'),
    data: {
      event: type("'newLogs' | 'stopLogs'"),
      lines: 'string[]?',
    },
  }),
);

export type SSE = typeof sseSchema.infer;
