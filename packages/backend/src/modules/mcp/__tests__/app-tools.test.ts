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
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { DockerService } from '@/modules/docker/docker.service';
import { EnvUtils } from '@/modules/env/env.utils';
import { McpAppsService } from '../mcp-apps.service';
import { McpAppTools } from '../app-tools';

const identity = fromPartial<AgentIdentity>({ user: { id: 42, username: 'agent-owner@example.com', operator: true }, credentialId: 'credential-42' });

describe('app tools through the SDK client', () => {
  let apps: ReturnType<typeof mock<AppsService>>;
  let marketplace: ReturnType<typeof mock<MarketplaceService>>;
  let config: ReturnType<typeof mock<ConfigurationService>>;
  let files: ReturnType<typeof mock<AppFilesManager>>;
  let docker: ReturnType<typeof mock<DockerService>>;
  let client: Client;
  let handler: ReturnType<typeof createMcpHandler>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [McpAppTools, McpAppsService, EnvUtils] })
      .useMocker(mock)
      .compile();

    apps = module.get(AppsService);
    marketplace = module.get(MarketplaceService);
    config = module.get(ConfigurationService);
    files = module.get(AppFilesManager);
    docker = module.get(DockerService);
    files.getAppEnv.mockResolvedValue({ path: '/app.env', content: '' });
    files.getUserEnv.mockResolvedValue({ path: '/override.env', content: '' });
    config.getConfig.mockReturnValue(fromPartial({ internalIp: '127.0.0.1', userSettings: { sslPort: 443, localDomain: 'tipi.lan' } }));
    config.get.calledWith('version').mockReturnValue('4.5.0');

    handler = createMcpHandler(() => {
      const server = new McpServer({ name: 'test-runtipi', version: '1.0.0' });
      const registry = new ToolRegistry(server, identity, mock<LoggerService>());
      module.get(McpAppTools).register(registry, identity);
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

  it('filters query searches and returns concise catalog entries with compatibility', async () => {
    const catalog = [
      {
        urn: 'bookstack:store',
        id: 'bookstack',
        name: 'BookStack',
        version: '1.0',
        tipi_version: 2,
        min_tipi_version: '4.8.0',
        description: 'README'.repeat(10000),
      },
      { urn: 'other:store', id: 'other', name: 'Other', version: '1.0', tipi_version: 1, description: 'README'.repeat(10000) },
    ];
    marketplace.searchApps.mockImplementationOnce(async ({ search }) => {
      const data = catalog.filter((app) => !search || app.name.toLowerCase().includes(search.toLowerCase()));
      return fromPartial({ data, total: data.length, nextCursor: null });
    });

    const result = await client.callTool({ name: 'search_apps', arguments: { query: 'bookstack' } });

    expect(result.structuredContent).toMatchObject({
      data: [{ urn: 'bookstack:store', compatibility: { compatible: false, instanceVersion: '4.5.0', minimumVersion: '4.8.0' } }],
      total: 1,
    });
    expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThan(4000);
  });

  it('exposes access URLs, runtime health and restart guidance on app inspection', async () => {
    apps.getApp.mockResolvedValueOnce(
      fromPartial({
        app: { status: 'running', port: 8235, openPort: true, pendingRestart: true },
        info: { urn: 'bookstack:store', name: 'BookStack', min_tipi_version: '4.8.0', form_fields: [] },
        metadata: { localSubdomain: 'bookstack-store' },
      }),
    );
    files.getAppEnv.mockResolvedValueOnce({ path: '/app.env', content: 'APP_DOMAIN=127.0.0.1:8235\nAPP_KEY=private-key' });
    docker.getAppRuntime.mockResolvedValueOnce(fromPartial([{ name: 'bookstack', state: 'restarting', health: null, restartCount: 17 }]));

    const result = await client.callTool({ name: 'get_app', arguments: { urn: 'bookstack:store' } });

    expect(result.structuredContent).toMatchObject({
      accessUrl: 'http://127.0.0.1:8235',
      environment: { APP_DOMAIN: '127.0.0.1:8235', APP_KEY: '[redacted]' },
      compatibility: { compatible: false },
      runtime: { containers: [{ state: 'restarting', restartCount: 17 }] },
      pendingRestartInfo: { action: 'restart_app' },
    });
    expect(JSON.stringify(result)).not.toContain('private-key');
  });

  it('rejects conflicting search aliases before querying the marketplace', async () => {
    const result = await client.callTool({ name: 'search_apps', arguments: { query: 'a', search: 'b' } });
    expect(result.isError).toBe(true);
    expect(marketplace.searchApps).not.toHaveBeenCalled();
  });
});
