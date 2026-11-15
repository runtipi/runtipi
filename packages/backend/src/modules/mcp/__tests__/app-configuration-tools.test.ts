import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { LoggerService } from '@/core/logger/logger.service';
import type { AgentIdentity } from '@/modules/agent-credentials/agent-credentials.service';
import { ToolRegistry } from '../tool-registry';
import { AppsService } from '@/modules/apps/apps.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { DockerService } from '@/modules/docker/docker.service';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { EnvUtils } from '@/modules/env/env.utils';
import { McpAppsService } from '../mcp-apps.service';
import { McpAppConfigurationTools } from '../app-configuration-tools';

const identity = fromPartial<AgentIdentity>({ user: { id: 42, username: 'agent-owner@example.com', operator: true }, credentialId: 'credential-42' });

describe('app configuration tools through the SDK client', () => {
  let apps: ReturnType<typeof mock<AppsService>>;
  let files: ReturnType<typeof mock<AppFilesManager>>;
  let docker: ReturnType<typeof mock<DockerService>>;
  let appConfig: ReturnType<typeof mock<AppConfigService>>;
  let client: Client;
  let handler: ReturnType<typeof createMcpHandler>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [McpAppConfigurationTools, McpAppsService, EnvUtils] })
      .useMocker(() => mock())
      .compile();

    apps = module.get(AppsService);
    files = module.get(AppFilesManager);
    docker = module.get(DockerService);
    appConfig = module.get(AppConfigService);
    files.getUserEnv.mockResolvedValue({ path: '/override.env', content: '' });

    handler = createMcpHandler(() => {
      const server = new McpServer({ name: 'test-runtipi', version: '1.0.0' });
      const registry = new ToolRegistry(server, identity, mock<LoggerService>());
      module.get(McpAppConfigurationTools).register(registry);
      return server;
    });
    client = new Client({ name: 'test-agent', version: '1.0.0' });
    await client.connect(
      new StreamableHTTPClientTransport(new URL('http://localhost/api/mcp'), {
        fetch: (url, init) => handler.fetch(new Request(String(url), init)),
      }),
    );
  });

  afterEach(async () => {
    await client?.close();
    await handler?.close();
  });

  it('shows resolved service URLs and empty variables without revealing secrets by default', async () => {
    apps.getApp.mockResolvedValue(fromPartial({ app: { pendingRestart: true, userConfigEnabled: false } }));
    files.getAppEnv.mockResolvedValue({ path: '/app.env', content: 'APP_DOMAIN=127.0.0.1:8235\nAPP_KEY=private-key' });
    docker.getEffectiveAppServices.mockResolvedValue({
      bookstack: {
        environment: { APP_URL: 'http://127.0.0.1:8235', ASSET_URL: 'http://127.0.0.1:8235', APP_KEY: '', DB_PASSWORD: 'private-password' },
      },
    });

    const result = await client.callTool({ name: 'get_app_environment', arguments: { urn: 'bookstack:store' } });

    expect(result.structuredContent).toMatchObject({
      includesSecrets: false,
      pendingRestart: true,
      overridesEnabled: false,
      services: {
        bookstack: {
          environment: { APP_URL: 'http://127.0.0.1:8235', ASSET_URL: 'http://127.0.0.1:8235', APP_KEY: '[redacted]' },
          emptyVariables: ['APP_KEY'],
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain('private-password');
    expect(JSON.stringify(result)).not.toContain('private-key');

    const unredacted = await client.callTool({ name: 'get_app_environment', arguments: { urn: 'bookstack:store', includeSecrets: true } });
    expect(unredacted.structuredContent).toMatchObject({
      generated: { APP_KEY: 'private-key' },
      services: { bookstack: { environment: { DB_PASSWORD: 'private-password' } } },
    });
  });

  it('preserves a missing editable configuration as a nullable field', async () => {
    appConfig.getAppConfig.mockResolvedValueOnce(null);

    const result = await client.callTool({ name: 'get_app_config', arguments: { urn: 'app:store' } });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({ config: null });
  });
});
