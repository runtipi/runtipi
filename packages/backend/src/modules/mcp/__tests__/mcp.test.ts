import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { ConfigurationService } from '@/core/config/configuration.service';
import type { AgentIdentity } from '@/modules/agent-credentials/agent-credentials.service';
import { McpToolsService } from '../mcp-tools.service';
import { McpAppTools } from '../app-tools';
import { McpMarketplaceTools } from '../marketplace-tools';
import { McpAppConfigurationTools } from '../app-configuration-tools';
import { McpBackupTools } from '../backup-tools';
import { McpAccountTools } from '../account-tools';
import { McpSystemTools } from '../system-tools';

const identity = fromPartial<AgentIdentity>({ user: { id: 42, username: 'agent-owner@example.com', operator: true }, credentialId: 'credential-42' });

test('discovers public capabilities with valid schemas and excludes CLI recovery', async () => {
  const config = mock<ConfigurationService>();
  config.get.calledWith('version').mockReturnValue('4.5.0');
  const module = await Test.createTestingModule({
    providers: [
      { provide: ConfigurationService, useValue: config },
      McpToolsService,
      McpAppTools,
      McpMarketplaceTools,
      McpAppConfigurationTools,
      McpBackupTools,
      McpAccountTools,
      McpSystemTools,
    ],
  })
    .useMocker(mock)
    .compile();
  const handler = createMcpHandler(() => module.get(McpToolsService).createServer(identity));
  const client = new Client({ name: 'test-agent', version: '1.0.0' });
  try {
    await client.connect(
      new StreamableHTTPClientTransport(new URL('http://localhost/api/mcp'), { fetch: (url, init) => handler.fetch(new Request(String(url), init)) }),
    );
    const { tools } = await client.listTools();
    const names = tools.map(({ name }) => name);

    expect(names).toEqual(
      expect.arrayContaining([
        'install_app',
        'update_app',
        'reset_app',
        'restore_backup',
        'create_custom_app',
        'update_user_config',
        'change_password',
        'disable_totp',
        'get_backup_transfer',
        'get_logo_upload',
        'get_operation',
      ]),
    );
    expect(names).not.toContain('reset_password');
    expect(new Set(names).size).toBe(names.length);
    expect(tools.every((tool) => tool.outputSchema?.type === 'object')).toBe(true);
    expect(tools.every((tool) => tool.inputSchema.type === 'object')).toBe(true);
  } finally {
    await client.close();
    await handler.close();
  }
});
