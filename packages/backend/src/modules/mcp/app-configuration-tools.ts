import { BadRequestException, Injectable } from '@nestjs/common';
import { type } from 'arktype';
import { castAppUrn } from '@/common/helpers/app-helpers';
import { CustomAppService } from '@/modules/custom-apps/custom-apps.service';
import { CreateCustomAppDto, UpdateCustomAppDto } from '@/modules/custom-apps/dto/custom-apps.dto';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { UserConfigService } from '@/modules/user-config/user-config.service';
import { McpAppsService } from './mcp-apps.service';
import { ToolRegistry } from './tool-registry';
import { urnSchema, appInput, toolOutputs } from './tool-contracts';

@Injectable()
export class McpAppConfigurationTools {
  constructor(
    private readonly customApps: CustomAppService,
    private readonly appConfig: AppConfigService,
    private readonly userConfig: UserConfigService,
    private readonly appDetails: McpAppsService,
  ) {}

  register(tools: ToolRegistry) {
    tools.add(
      'create_custom_app',
      'Create a custom app from dynamic compose YAML.',
      type({ name: '/^[a-z0-9-]{1,50}$/', config: 'string' }),
      toolOutputs.create_custom_app,
      (input) => {
        const parsed = CreateCustomAppDto.schema(input);
        if (parsed instanceof type.errors) throw new BadRequestException(parsed.summary);

        return this.customApps.createCustomApp(parsed);
      },
    );

    tools.add(
      'update_custom_app',
      'Update a custom app using dynamic compose YAML.',
      type({ urn: urnSchema, config: 'string' }),
      toolOutputs.update_custom_app,
      async ({ urn, config }) => {
        await this.customApps.updateCustomApp(castAppUrn(urn), UpdateCustomAppDto.schema.assert({ config }).config);
        return { success: true };
      },
    );

    tools.add(
      'update_app_metadata',
      'Update editable app metadata text.',
      type({ urn: urnSchema, data: 'string' }),
      toolOutputs.update_app_metadata,
      async ({ urn, data }) => {
        await this.customApps.updateAppMetadata(castAppUrn(urn), data);
        return { success: true };
      },
    );

    tools.add(
      'get_app_config',
      'Read the editable dynamic compose definition as serialized JSON (also valid YAML). This is not the runtime form. Edit the returned config field and pass that string to update_app_config.',
      appInput,
      toolOutputs.get_app_config,
      async ({ urn }) => ({ config: await this.appConfig.getAppConfig(castAppUrn(urn)) }),
      true,
    );
    tools.add(
      'update_app_config',
      'Write the dynamic compose definition. config is a YAML or JSON string, not a form object. Read get_app_config, edit its serialized content and pass it back. Use update_app_settings for ports, exposure and form_fields values; restart_app applies definition changes.',
      type({
        urn: urnSchema,
        config: type('string').describe('Complete dynamic compose definition serialized as YAML or JSON; obtain with get_app_config.'),
      }),
      toolOutputs.update_app_config,
      async ({ urn, config }) => {
        await this.appConfig.updateAppConfig(castAppUrn(urn), { config });
        return { success: true };
      },
    );

    tools.add(
      'get_template_diff',
      'Compare the app definition with its template.',
      appInput,
      toolOutputs.get_template_diff,
      ({ urn }) => this.appConfig.getTemplateDiff(castAppUrn(urn)),
      true,
    );

    tools.add(
      'sync_app_template',
      'Replace the app definition with the latest template.',
      appInput,
      toolOutputs.sync_app_template,
      async ({ urn }) => {
        await this.appConfig.syncWithTemplate(castAppUrn(urn));
        return { success: true };
      },
    );

    tools.add(
      'get_user_config',
      'Read user-authored compose/env overrides only. appEnv: null means no override file; it does not mean generated app.env is empty. Use get_app_environment for generated and resolved values. May contain secrets.',
      appInput,
      toolOutputs.get_user_config,
      ({ urn }) => this.userConfig.getUserConfig(castAppUrn(urn)),
      true,
    );

    tools.add(
      'get_app_environment',
      'Read generated app.env and environment resolved by Docker Compose, including APP_DOMAIN, APP_URL and ASSET_URL when defined. Other values are redacted by default; set includeSecrets:true to inspect secrets. These are saved/rendered values, not a snapshot of running containers; pendingRestart indicates unapplied changes.',
      type({ urn: urnSchema, includeSecrets: 'boolean = false' }),
      toolOutputs.get_app_environment,
      ({ urn, includeSecrets }) => this.appDetails.environment(castAppUrn(urn), includeSecrets),
      true,
    );

    tools.add(
      'update_user_config',
      'Write compose/env overrides.',
      type({ urn: urnSchema, dockerCompose: 'string', appEnv: 'string' }),
      toolOutputs.update_user_config,
      async ({ urn, ...input }) => {
        await this.userConfig.updateUserConfig(castAppUrn(urn), input);
        return { success: true };
      },
    );

    tools.add('enable_user_config', 'Enable compose/env overrides.', appInput, toolOutputs.enable_user_config, async ({ urn }) => {
      await this.userConfig.enableUserConfig(castAppUrn(urn));
      return { success: true };
    });
    tools.add('disable_user_config', 'Disable compose/env overrides.', appInput, toolOutputs.disable_user_config, async ({ urn }) => {
      await this.userConfig.disableUserConfig(castAppUrn(urn));
      return { success: true };
    });
  }
}
