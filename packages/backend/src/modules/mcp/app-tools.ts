import { LinksService } from '@/modules/links/links.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { type } from 'arktype';
import { castAppUrn } from '@/common/helpers/app-helpers';
import { AppsService } from '@/modules/apps/apps.service';
import { AppLifecycleService } from '@/modules/app-lifecycle/app-lifecycle.service';
import { AppJobService } from '@/modules/app-lifecycle/services/app-job.service';
import { GuestAppsDto } from '@/modules/apps/dto/app.dto';
import { appFormSchema } from '@/modules/app-lifecycle/dto/app-lifecycle.dto';
import type { AgentIdentity } from '@/modules/agent-credentials/agent-credentials.service';
import { McpAppsService } from './mcp-apps.service';
import { McpOperationsService } from './mcp-operations.service';
import { ToolRegistry } from './tool-registry';
import { emptyInput, urnSchema, appInput, toolOutputs } from './tool-contracts';

@Injectable()
export class McpAppTools {
  constructor(
    private readonly links: LinksService,
    private readonly apps: AppsService,
    private readonly appDetails: McpAppsService,
    private readonly lifecycle: AppLifecycleService,
    private readonly jobs: AppJobService,
    private readonly operations: McpOperationsService,
  ) {}

  register(tools: ToolRegistry, identity: AgentIdentity) {
    tools.add(
      'list_apps',
      'List installed apps without secret configuration values.',
      emptyInput,
      toolOutputs.list_apps,
      async () => {
        const apps = await this.apps.getInstalledApps();

        return {
          apps: apps.map((item) => {
            const { app, info } = item;
            const accessUrls = this.appDetails.accessUrls(item);

            return {
              urn: info.urn,
              name: info.name,
              status: app.status,
              version: app.version,
              pendingRestart: app.pendingRestart,
              pendingRestartInfo: this.appDetails.restartInfo(app.pendingRestart),
              accessUrl: accessUrls.exposed ?? accessUrls.local ?? accessUrls.direct,
              accessUrls,
            };
          }),
        };
      },
      true,
    );

    tools.add(
      'get_guest_dashboard',
      'Read the publicly visible guest dashboard apps and links.',
      emptyInput,
      toolOutputs.get_guest_dashboard,
      async () => ({
        ...GuestAppsDto.parse({ installed: await this.apps.getGuestDashboardApps() }),
        links: await this.links.getGuestDashboardLinks(),
      }),
      true,
    );

    tools.add(
      'search_apps',
      'Search the catalog by query (search is an alias). Returns concise entries with URNs and minimum-version compatibility. Example: {"query":"bookstack","pageSize":5}. Use get_app with the returned urn to inspect form_fields before installation.',
      type({
        query: 'string?',
        search: 'string?',
        pageSize: '1 <= number.integer <= 100 = 24',
        cursor: 'string?',
        category: 'string?',
        storeId: 'string?',
      }),
      toolOutputs.search_apps,
      ({ query, search, ...input }) => {
        if (query !== undefined && search !== undefined && query !== search)
          throw new BadRequestException('Use query or search, or supply the same value for both');

        return this.appDetails.search({ ...input, search: query ?? search });
      },
      true,
    );

    tools.add(
      'get_app',
      'Inspect metadata, form_fields, current configuration, accessUrl/accessUrls, compatibility, container state/health/restart counts, and pending restart guidance. A running container without a health check is not proof of application health. May contain secrets in saved form configuration.',
      appInput,
      toolOutputs.get_app,
      ({ urn }) => this.appDetails.get(castAppUrn(urn)),
      true,
    );

    tools.add(
      'get_random_port',
      'Find a free app port.',
      emptyInput,
      toolOutputs.get_random_port,
      async () => ({ port: await this.apps.getRandomPort() }),
      true,
    );
    tools.add(
      'get_compose_diff',
      'Compare the installed compose definition with its catalog template. This does not compare saved settings with running containers; see get_app.pendingRestartInfo.',
      appInput,
      toolOutputs.get_compose_diff,
      ({ urn }) => this.apps.getAppComposeDiff(castAppUrn(urn)),
      true,
    );
    tools.add(
      'get_config_diff',
      'Compare installed metadata with its catalog template. Runtime form settings and environment changes are separate; inspect get_app and get_app_environment.',
      appInput,
      toolOutputs.get_config_diff,
      ({ urn }) => this.apps.getAppConfigDiff(castAppUrn(urn)),
      true,
    );
    tools.add('ignore_app_version', 'Ignore the currently available app update.', appInput, toolOutputs.ignore_app_version, async ({ urn }) => {
      await this.apps.ignoreAppVersion(castAppUrn(urn));
      return { success: true };
    });
    tools.add('unignore_app_version', 'Allow the ignored app update again.', appInput, toolOutputs.unignore_app_version, async ({ urn }) => {
      await this.apps.unignoreAppVersion(castAppUrn(urn));
      return { success: true };
    });

    tools.add(
      'install_app',
      'Install using runtime form settings, e.g. {"urn":"bookstack:runtipi","form":{"port":8235,"openPort":true}}. Read get_app.info.form_fields and compatibility first; add required values by env_variable inside form. Random fields are generated server-side when omitted. Returns an operationId; poll get_operation, then check get_app runtime and get_logs.',
      type({
        urn: urnSchema,
        form: appFormSchema.describe(
          'Runtime settings object: port/exposure options plus app form fields keyed by env_variable. Omitted random values are generated by the backend. Not a serialized compose definition.',
        ),
      }),
      toolOutputs.install_app,
      ({ urn, form }) =>
        this.operations.start(identity, castAppUrn(urn), 'install', () => this.lifecycle.installApp({ appUrn: castAppUrn(urn), form })),
    );

    for (const command of ['start', 'stop', 'restart', 'reset'] as const) {
      tools.add(
        `${command}_app`,
        `${command} an app. Reset removes app data. Returns an accepted operation.`,
        appInput,
        toolOutputs.start_app,
        ({ urn }) =>
          this.operations.start(identity, castAppUrn(urn), command, () => {
            const appUrn = castAppUrn(urn);

            switch (command) {
              case 'start':
                return this.lifecycle.startApp({ appUrn });
              case 'stop':
                return this.lifecycle.stopApp({ appUrn });
              case 'restart':
                return this.lifecycle.restartApp({ appUrn });
              case 'reset':
                return this.lifecycle.resetApp({ appUrn });
            }
          }),
      );
    }

    tools.add(
      'uninstall_app',
      'Uninstall an app and its data, optionally deleting backups.',
      type({ urn: urnSchema, removeBackups: 'boolean' }),
      toolOutputs.uninstall_app,
      ({ urn, removeBackups }) =>
        this.operations.start(identity, castAppUrn(urn), 'uninstall', () => this.lifecycle.uninstallApp({ appUrn: castAppUrn(urn), removeBackups })),
    );

    tools.add(
      'update_app',
      'Update an app, optionally taking a backup. Returns an accepted cancellable job.',
      type({ urn: urnSchema, performBackup: 'boolean = true' }),
      toolOutputs.update_app,
      ({ urn, performBackup }) =>
        this.operations.start(identity, castAppUrn(urn), 'update', () => this.lifecycle.updateApp({ appUrn: castAppUrn(urn), performBackup })),
    );

    tools.add(
      'update_app_settings',
      'Replace runtime form settings, not the compose definition. Start with get_app.app.config, merge changes, and submit the full form object keyed by form_fields.env_variable. Restart the app if pendingRestart is true.',
      type({
        urn: urnSchema,
        form: appFormSchema.describe(
          'Runtime settings object: port/exposure options plus app form fields keyed by env_variable. Omitted random values are generated by the backend. Not a serialized compose definition.',
        ),
      }),
      toolOutputs.update_app_settings,
      ({ urn, form }) => this.lifecycle.updateAppSettings({ appUrn: castAppUrn(urn), form }),
    );

    tools.add(
      'get_app_job',
      'Inspect the latest update/backup job, including work started through the dashboard or CLI.',
      type({ urn: urnSchema, requestId: 'string.uuid?' }),
      toolOutputs.get_app_job,
      ({ urn, requestId }) => ({ job: this.jobs.getJob(castAppUrn(urn), requestId) }),
      true,
    );

    tools.add(
      'cancel_app_job',
      'Cancel an app update/backup job started through any interface when its phase permits it.',
      type({ urn: urnSchema, requestId: 'string.uuid' }),
      toolOutputs.cancel_app_job,
      ({ urn, requestId }) => ({ job: this.jobs.cancel(castAppUrn(urn), requestId) }),
    );

    tools.add(
      'get_operation',
      'Poll a lifecycle operationId for status, phase and message. Terminal statuses: succeeded, failed, cancelled, unknown. Succeeded means the lifecycle command completed; inspect get_app runtime and get_logs for application health. Unknown/expired IDs are not successful operations.',
      type({ operationId: 'string.uuid' }),
      toolOutputs.get_operation,
      ({ operationId }) => this.operations.get(identity.user.id, operationId),
      true,
    );

    tools.add(
      'cancel_operation',
      'Cancel an update/backup when its current phase permits cancellation.',
      type({ operationId: 'string.uuid' }),
      toolOutputs.cancel_operation,
      ({ operationId }) => this.operations.cancel(identity.user.id, operationId),
    );

    for (const command of ['start', 'stop', 'restart', 'update'] as const) {
      tools.add(
        `${command}_all_apps`,
        `${command} eligible installed apps using the shared lifecycle bulk policy.`,
        emptyInput,
        toolOutputs.start_all_apps,
        async () => {
          const results = await this.lifecycle.runBulk(command);

          return {
            operations: results.map((result) => {
              if (result.status === 'rejected') return result;
              return this.operations.adopt(identity, result.urn, command, result.requestId);
            }),
          };
        },
      );
    }
  }
}
