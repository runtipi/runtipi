import { type } from 'arktype';
import { appJobSchema } from '@runtipi/common/schemas';
import { AppStoreDto } from '@/modules/marketplace/dto/marketplace.dto';
import { GetAppBackupsDto } from '@/modules/backups/dto/backups.dto';
import { linkSchema } from '@/modules/links/dto/links.dto';
import { GetComposeDiffDto } from '@/modules/apps/dto/app.dto';
import { TemplateDiffDto } from '@/modules/app-config/dto/app-config.dto';

export const emptyInput = type({});
export const urnSchema = type(/^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/).describe(
  'App URN returned by search_apps or list_apps, including its store suffix, e.g. bookstack:runtipi.',
);
export const appInput = type({ urn: urnSchema });
export const backupInput = type({ urn: urnSchema, filename: 'string' });
const object = type('Record<string, unknown>');
const nullableText = type('string | null');
const success = type({ success: 'boolean' });
const compatibility = type({ compatible: 'boolean | null', instanceVersion: 'string', minimumVersion: nullableText, reason: nullableText });
const accessUrls = type({ direct: nullableText, local: nullableText, exposed: nullableText });
const restartInfo = type({ reason: 'string', action: 'string', diffScope: 'string' }).or('null');
const accepted = type({ urn: 'string', operationId: 'string.uuid', requestId: 'string.uuid', status: 'string' });
const operation = type({
  operationId: 'string.uuid',
  requestId: 'string.uuid',
  urn: 'string',
  command: 'string',
  status: 'string',
  message: 'string',
  cancellable: 'boolean',
  phase: 'string',
  createdAt: 'number',
  updatedAt: 'number',
});
const bulk = type({
  operations: type({ urn: 'string', status: 'string', 'operationId?': 'string', 'requestId?': 'string', 'message?': 'string' }).array(),
});

export const toolOutputs = {
  list_apps: type({
    apps: type({
      urn: 'string',
      name: 'string',
      status: 'string',
      version: 'number',
      pendingRestart: 'boolean',
      pendingRestartInfo: restartInfo,
      accessUrl: nullableText,
      accessUrls,
    }).array(),
  }),
  get_guest_dashboard: type({ installed: object.array(), links: linkSchema.array() }),
  search_apps: type({
    data: type({
      urn: 'string',
      name: 'string',
      version: 'string',
      tipi_version: 'number',
      min_tipi_version: nullableText,
      'short_desc?': 'string',
      compatibility,
    }).array(),
    total: 'number',
    nextCursor: nullableText,
  }),
  get_app: type({
    app: object.or('null'),
    info: object,
    metadata: object,
    compatibility,
    accessUrl: nullableText,
    accessUrls,
    runtime: object.or('null'),
    'environment?': object,
    'warnings?': 'string[]',
    'pendingRestartInfo?': restartInfo,
    'updateCompatibility?': compatibility.or('null'),
  }),
  get_random_port: type({ port: 'number' }),
  get_compose_diff: GetComposeDiffDto.schema,
  get_config_diff: GetComposeDiffDto.schema,
  ignore_app_version: success,
  unignore_app_version: success,
  install_app: accepted,
  start_app: accepted,
  stop_app: accepted,
  restart_app: accepted,
  reset_app: accepted,
  uninstall_app: accepted,
  update_app: accepted,
  update_app_settings: type({ requestId: 'string.uuid' }),
  get_app_job: type({ job: appJobSchema.or('null') }),
  cancel_app_job: type({ job: appJobSchema.or('null') }),
  get_operation: operation,
  cancel_operation: operation,
  start_all_apps: bulk,
  stop_all_apps: bulk,
  restart_all_apps: bulk,
  update_all_apps: bulk,
  list_app_stores: type({ appStores: AppStoreDto.schema.array() }),
  list_enabled_app_stores: type({ appStores: AppStoreDto.schema.array() }),
  create_app_store: AppStoreDto.schema,
  update_app_store: success,
  delete_app_store: success,
  pull_app_stores: success,
  create_custom_app: type({ appUrn: 'string', appName: 'string', storeId: 'string' }),
  update_custom_app: success,
  update_app_metadata: success,
  get_app_config: type({ config: nullableText }),
  update_app_config: success,
  get_template_diff: TemplateDiffDto.schema,
  sync_app_template: success,
  get_user_config: type({ dockerCompose: nullableText, appEnv: nullableText, sourceCompose: nullableText, isEnabled: 'boolean' }),
  get_app_environment: type({
    source: 'string',
    includesSecrets: 'boolean',
    pendingRestart: 'boolean',
    overridesEnabled: 'boolean',
    generated: object,
    overrides: object,
    services: type({ '[string]': { environment: object, emptyVariables: 'string[]' } }),
  }),
  update_user_config: success,
  enable_user_config: success,
  disable_user_config: success,
  get_system_load: type({
    diskUsed: 'number',
    diskSize: 'number',
    percentUsed: 'number',
    cpuLoad: 'number',
    memoryTotal: 'number',
    percentUsedMemory: 'number',
    memorySource: "'cgroup' | 'containers' | 'host'",
  }),
  get_local_certificate: type({ certificate: 'string' }),
  get_logs: type({ text: 'string', truncated: 'boolean' }),
  list_backups: GetAppBackupsDto.schema,
  delete_backup: success,
  get_backup_transfer: type({ method: "'GET' | 'PUT'", path: 'string', authorization: 'string', contentType: 'string' }),
  get_logo_upload: type({ method: 'string', path: 'string', authorization: 'string', maxUploadBytes: 'number' }),
  backup_app: accepted,
  restore_backup: accepted,
  get_instance: type({ version: object, userSettings: object, user: object }),
  update_instance_settings: success,
  acknowledge_welcome: success,
  list_links: type({ links: linkSchema.array() }),
  create_link: type({ link: linkSchema.or('null') }),
  update_link: type({ link: linkSchema.or('null') }),
  delete_link: success,
  change_username: success,
  change_password: success,
  get_totp_setup: type({ key: 'string', uri: 'string' }),
  setup_totp: success,
  disable_totp: success,
};
