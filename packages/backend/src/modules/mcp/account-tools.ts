import { Injectable } from '@nestjs/common';
import { type } from 'arktype';
import { LinksService } from '@/modules/links/links.service';
import { EditLinkBodyDto, LinkBodyDto } from '@/modules/links/dto/links.dto';
import { AuthService } from '@/modules/auth/auth.service';
import { ChangePasswordBody, ChangeUsernameBody, DisableTotpBody, GetTotpUriBody, SetupTotpBody } from '@/modules/auth/dto/auth.dto';
import type { AgentIdentity } from '@/modules/agent-credentials/agent-credentials.service';
import { ToolRegistry } from './tool-registry';
import { emptyInput, toolOutputs } from './tool-contracts';

@Injectable()
export class McpAccountTools {
  constructor(
    private readonly auth: AuthService,
    private readonly links: LinksService,
  ) {}

  register(tools: ToolRegistry, identity: AgentIdentity) {
    const userId = identity.user.id;
    tools.add(
      'list_links',
      'List the credential owner dashboard links.',
      emptyInput,
      toolOutputs.list_links,
      async () => ({ links: await this.links.getLinks(userId) }),
      true,
    );
    tools.add('create_link', 'Create a dashboard link for the credential owner.', LinkBodyDto.schema, toolOutputs.create_link, async (input) => ({
      link: (await this.links.add(input, userId)) ?? null,
    }));
    tools.add(
      'update_link',
      'Update a dashboard link owned by the credential owner.',
      type({ id: 'number.integer', link: EditLinkBodyDto.schema }),
      toolOutputs.update_link,
      async ({ id, link }) => ({ link: (await this.links.edit(id, link, userId)) ?? null }),
    );

    tools.add(
      'delete_link',
      'Delete a dashboard link owned by the credential owner.',
      type({ id: 'number.integer' }),
      toolOutputs.delete_link,
      async ({ id }) => {
        await this.links.delete(id, userId);
        return { success: true };
      },
    );

    tools.add(
      'change_username',
      'Change the owner username with password verification. Invalidates agent credentials.',
      ChangeUsernameBody.schema,
      toolOutputs.change_username,
      async (input) => ({ success: await this.auth.changeUsername({ ...input, userId }) }),
    );

    tools.add(
      'change_password',
      'Change the owner password with current-password verification. Invalidates agent credentials.',
      ChangePasswordBody.schema,
      toolOutputs.change_password,
      async (input) => ({ success: await this.auth.changePassword({ ...input, userId }) }),
    );

    tools.add(
      'get_totp_setup',
      'Generate a TOTP setup secret after password verification. Returns secret material.',
      GetTotpUriBody.schema,
      toolOutputs.get_totp_setup,
      (input) => this.auth.getTotpUri({ ...input, userId }),
    );

    tools.add(
      'setup_totp',
      'Enable TOTP with a valid code. Invalidates agent credentials.',
      SetupTotpBody.schema,
      toolOutputs.setup_totp,
      async ({ code }) => ({ success: await this.auth.setupTotp({ userId, totpCode: code }) }),
    );

    tools.add(
      'disable_totp',
      'Disable TOTP after password verification. Invalidates agent credentials.',
      DisableTotpBody.schema,
      toolOutputs.disable_totp,
      async (input) => ({ success: await this.auth.disableTotp({ ...input, userId }) }),
    );
  }
}
