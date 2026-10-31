import { InstanceService } from '@/modules/system/instance.service';
import { McpSystemTools } from '../system-tools';
import { McpAccountTools } from '../account-tools';
import { McpBackupTools } from '../backup-tools';
import { McpAppConfigurationTools } from '../app-configuration-tools';
import { McpMarketplaceTools } from '../marketplace-tools';
import { McpAppTools } from '../app-tools';
import { AppJobService } from '@/modules/app-lifecycle/services/app-job.service';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { Test } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { fromPartial } from '@total-typescript/shoehorn';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AppService } from '@/app.service';
import { AppsService } from '@/modules/apps/apps.service';
import { AppLifecycleService } from '@/modules/app-lifecycle/app-lifecycle.service';
import { AppStoreService } from '@/modules/app-stores/app-store.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import { CustomAppService } from '@/modules/custom-apps/custom-apps.service';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { UserConfigService } from '@/modules/user-config/user-config.service';
import { BackupsService } from '@/modules/backups/backups.service';
import { DockerService } from '@/modules/docker/docker.service';
import { LinksService } from '@/modules/links/links.service';
import { AuthService } from '@/modules/auth/auth.service';
import { UserRepository } from '@/modules/user/user.repository';
import { ConfigurationService } from '@/core/config/configuration.service';
import { SystemService } from '@/modules/system/system.service';
import { LoggerService } from '@/core/logger/logger.service';
import type { AgentIdentity } from '@/modules/agent-credentials/agent-credentials.service';
import { McpAppsService } from '../mcp-apps.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { EnvUtils } from '@/modules/env/env.utils';
import { McpToolsService } from '../mcp-tools.service';
import { McpOperationsService } from '../mcp-operations.service';

const identity = fromPartial<AgentIdentity>({ user: { id: 42, username: 'agent-owner@example.com', operator: true }, credentialId: 'credential-42' });

describe('Runtipi MCP tools through the SDK client', () => {
  const apps = mock<AppsService>();
  const links = mock<LinksService>();
  const config = mock<ConfigurationService>();
  const lifecycle = mock<AppLifecycleService>();
  const marketplace = mock<MarketplaceService>();
  const stores = mock<AppStoreService>();
  const auth = mock<AuthService>();
  const docker = mock<DockerService>();
  const logger = mock<LoggerService>();
  const files = mock<AppFilesManager>();
  const appConfig = mock<AppConfigService>();
  let client: Client;
  let handler: ReturnType<typeof createMcpHandler>;

  beforeEach(async () => {
    vi.clearAllMocks();
    files.getAppEnv.mockResolvedValue({ path: '/app.env', content: '' });
    files.getUserEnv.mockResolvedValue({ path: '/override.env', content: '' });
    config.getConfig.mockReturnValue(fromPartial({ internalIp: '127.0.0.1', userSettings: { sslPort: 443, localDomain: 'tipi.lan' } }));
    config.get.calledWith('version').mockReturnValue('4.5.0');
    const module = await Test.createTestingModule({
      providers: [
        McpToolsService,
        McpAppTools,
        McpMarketplaceTools,
        McpAppConfigurationTools,
        McpBackupTools,
        McpAccountTools,
        McpSystemTools,
        { provide: InstanceService, useValue: mock<InstanceService>() },
        McpAppsService,
        EnvUtils,
        { provide: AppFilesManager, useValue: files },
        { provide: AppJobService, useValue: mock<AppJobService>() },
        { provide: AppsService, useValue: apps },
        { provide: AppLifecycleService, useValue: lifecycle },
        { provide: AppStoreService, useValue: stores },
        { provide: MarketplaceService, useValue: marketplace },
        { provide: CustomAppService, useValue: mock<CustomAppService>() },
        { provide: AppConfigService, useValue: appConfig },
        { provide: UserConfigService, useValue: mock<UserConfigService>() },
        { provide: BackupsService, useValue: mock<BackupsService>() },
        { provide: DockerService, useValue: docker },
        { provide: LinksService, useValue: links },
        { provide: AuthService, useValue: auth },
        { provide: UserRepository, useValue: mock<UserRepository>() },
        { provide: ConfigurationService, useValue: config },
        { provide: SystemService, useValue: mock<SystemService>() },
        { provide: McpOperationsService, useValue: mock<McpOperationsService>() },
        { provide: LoggerService, useValue: logger },
        { provide: AppService, useValue: mock<AppService>() },
      ],
    }).compile();

    handler = createMcpHandler(() => module.get(McpToolsService).createServer(identity));
    client = new Client({ name: 'test-agent', version: '1.0.0' });
    await client.connect(
      new StreamableHTTPClientTransport(new URL('http://localhost/api/mcp'), { fetch: (url, init) => handler.fetch(new Request(String(url), init)) }),
    );
  });

  afterEach(async () => {
    await client?.close();
    await handler?.close();
  });

  it('discovers the complete catalog with valid JSON schemas and no CLI recovery tool', async () => {
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
    expect(names).toHaveLength(64);
    expect(tools.every((tool) => tool.outputSchema?.type === 'object')).toBe(true);
    expect(tools.every((tool) => tool.inputSchema.type === 'object')).toBe(true);
  });

  it('always uses the credential owner for owned resources', async () => {
    links.getLinks.mockResolvedValue([]);
    const result = await client.callTool({ name: 'list_links', arguments: {} });

    expect(result.isError).not.toBe(true);
    expect(links.getLinks).toHaveBeenCalledWith(42);
  });

  it('preserves password verification inputs and prevents user ID substitution', async () => {
    const rejected = await client.callTool({
      name: 'change_password',
      arguments: { userId: 1, currentPassword: 'current', newPassword: 'new-password' },
    });
    expect(rejected.isError).toBe(true);
    expect(auth.changePassword).not.toHaveBeenCalled();

    await client.callTool({ name: 'change_password', arguments: { currentPassword: 'current', newPassword: 'new-password' } });

    expect(auth.changePassword).toHaveBeenCalledWith({ userId: 42, currentPassword: 'current', newPassword: 'new-password' });
  });

  it('validates log bounds before touching Docker', async () => {
    const result = await client.callTool({ name: 'get_logs', arguments: { maxLines: 1000000 } });

    expect(result.isError).toBe(true);
    expect(docker.getLogsSnapshot).not.toHaveBeenCalled();
  });

  it('delegates store mutation and refresh to the marketplace workflow', async () => {
    await client.callTool({ name: 'update_app_store', arguments: { id: 'store', settings: { name: 'Store', enabled: true } } });

    expect(marketplace.updateAppStore).toHaveBeenCalledWith('store', { name: 'Store', enabled: true });
  });

  it('rejects backup traversal before invoking lifecycle services', async () => {
    const result = await client.callTool({ name: 'delete_backup', arguments: { urn: 'app:store', filename: '../backup.tar.gz' } });

    expect(result.isError).toBe(true);
    expect(lifecycle.deleteAppBackup).not.toHaveBeenCalled();
  });

  it('does not leak internal errors or tool arguments into audit records', async () => {
    auth.changePassword.mockRejectedValueOnce(new HttpException('private internal details', 500));
    const result = await client.callTool({
      name: 'change_password',
      arguments: { currentPassword: 'private-password', newPassword: 'new-private-password' },
    });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).not.toContain('private internal details');
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain('private-password');
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('private-password');
  });

  it('provides an authenticated transfer descriptor without exposing filesystem paths', async () => {
    const result = await client.callTool({
      name: 'get_backup_transfer',
      arguments: { urn: 'app:store', filename: 'backup.tar.gz', direction: 'download' },
    });

    expect(result.structuredContent).toMatchObject({ method: 'GET', path: '/api/mcp/transfers/backups/app%3Astore/backup.tar.gz' });
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

  it('honors the lines parameter when reading logs', async () => {
    docker.getLogsSnapshot.mockImplementationOnce(async (lines) => ({
      text: Array.from({ length: 100 }, (_, index) => `line ${index}`)
        .slice(-lines)
        .join('\n'),
      truncated: false,
    }));

    const result = await client.callTool({ name: 'get_logs', arguments: { urn: 'app:store', lines: 3 } });

    expect(result.structuredContent).toMatchObject({ text: 'line 97\nline 98\nline 99' });
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

  it('rejects conflicting log and search aliases', async () => {
    const logs = await client.callTool({ name: 'get_logs', arguments: { lines: 3, maxLines: 4 } });
    const search = await client.callTool({ name: 'search_apps', arguments: { query: 'a', search: 'b' } });

    expect(logs.isError).toBe(true);
    expect(search.isError).toBe(true);
    expect(docker.getLogsSnapshot).not.toHaveBeenCalled();
    expect(marketplace.searchApps).not.toHaveBeenCalled();
  });

  it('rejects unknown top-level arguments instead of silently ignoring them', async () => {
    const result = await client.callTool({ name: 'list_links', arguments: { unexpected: 'value' } });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain('unexpected');
  });
  it('preserves a missing editable configuration as a nullable field', async () => {
    appConfig.getAppConfig.mockResolvedValueOnce(null);

    const result = await client.callTool({ name: 'get_app_config', arguments: { urn: 'app:store' } });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({ config: null });
  });
});
