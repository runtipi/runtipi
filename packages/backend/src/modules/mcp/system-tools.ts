import { BadRequestException, Injectable } from '@nestjs/common';
import { type } from 'arktype';
import { AcknowledgeWelcomeBody, UserSettingsBody } from '@/app.dto';
import { castAppUrn } from '@/common/helpers/app-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { SystemService } from '@/modules/system/system.service';
import { DockerService } from '@/modules/docker/docker.service';
import type { AgentIdentity } from '@/modules/agent-credentials/agent-credentials.service';
import { ToolRegistry } from './tool-registry';
import { InstanceService } from '@/modules/system/instance.service';
import { emptyInput, urnSchema, toolOutputs } from './tool-contracts';

@Injectable()
export class McpSystemTools {
  constructor(
    private readonly config: ConfigurationService,
    private readonly instance: InstanceService,
    private readonly system: SystemService,
    private readonly docker: DockerService,
  ) {}

  register(tools: ToolRegistry, identity: AgentIdentity) {
    tools.add(
      'get_instance',
      'Read instance version, settings, and the authenticated user.',
      emptyInput,
      toolOutputs.get_instance,
      async () => ({
        version: await this.instance.getVersion(),
        userSettings: this.config.get('userSettings'),
        user: identity.user,
      }),
      true,
    );

    tools.add(
      'update_instance_settings',
      'Update instance settings with the same validation as the dashboard.',
      UserSettingsBody.schema,
      toolOutputs.update_instance_settings,
      async (input) => {
        await this.config.setUserSettings(input);
        return { success: true };
      },
    );

    tools.add(
      'acknowledge_welcome',
      'Set the welcome and error-monitoring preference.',
      AcknowledgeWelcomeBody.schema,
      toolOutputs.acknowledge_welcome,
      async ({ allowErrorMonitoring }) => {
        await this.instance.acknowledgeWelcome(identity.user.id, allowErrorMonitoring);
        return { success: true };
      },
    );

    tools.add('get_system_load', 'Read system resource usage.', emptyInput, toolOutputs.get_system_load, () => this.system.getSystemLoad(), true);
    tools.add(
      'get_local_certificate',
      'Read the instance local TLS certificate.',
      emptyInput,
      toolOutputs.get_local_certificate,
      async () => ({ certificate: await this.system.getLocalCertificate() }),
      true,
    );

    tools.add(
      'get_logs',
      'Read timestamped app or instance logs, bounded to 256 KiB. lines (1–1000, default 100) is the tail per container; maxLines is a backwards-compatible alias. Example: {"urn":"bookstack:runtipi","lines":50}. truncated indicates the byte cap was reached.',
      type({ urn: urnSchema.optional(), lines: '1 <= number.integer <= 1000?', maxLines: '1 <= number.integer <= 1000?' }),
      toolOutputs.get_logs,
      ({ urn, lines, maxLines }) => {
        if (lines !== undefined && maxLines !== undefined && lines !== maxLines)
          throw new BadRequestException('Use lines or maxLines, or supply the same value for both');

        return this.docker.getLogsSnapshot(lines ?? maxLines ?? 100, urn ? castAppUrn(urn) : undefined);
      },
      true,
    );
  }
}
