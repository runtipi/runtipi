import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { LoggerService } from '@/core/logger/logger.service';
import type { AgentIdentity } from '@/modules/agent-credentials/agent-credentials.service';
import { ToolRegistry } from '../tool-registry';
import { AppLifecycleService } from '@/modules/app-lifecycle/app-lifecycle.service';
import { McpBackupTools } from '../backup-tools';

const identity = fromPartial<AgentIdentity>({ user: { id: 42, username: 'agent-owner@example.com', operator: true }, credentialId: 'credential-42' });

describe('backup tools through the SDK client', () => {
  let lifecycle: ReturnType<typeof mock<AppLifecycleService>>;
  let client: Client;
  let handler: ReturnType<typeof createMcpHandler>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [McpBackupTools] })
      .useMocker(mock)
      .compile();

    lifecycle = module.get(AppLifecycleService);

    handler = createMcpHandler(() => {
      const server = new McpServer({ name: 'test-runtipi', version: '1.0.0' });
      const registry = new ToolRegistry(server, identity, mock<LoggerService>());
      module.get(McpBackupTools).register(registry, identity);
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

  it('rejects backup traversal before invoking lifecycle services', async () => {
    const result = await client.callTool({ name: 'delete_backup', arguments: { urn: 'app:store', filename: '../backup.tar.gz' } });

    expect(result.isError).toBe(true);
    expect(lifecycle.deleteAppBackup).not.toHaveBeenCalled();
  });

  it('provides an authenticated transfer descriptor without exposing filesystem paths', async () => {
    const result = await client.callTool({
      name: 'get_backup_transfer',
      arguments: { urn: 'app:store', filename: 'backup.tar.gz', direction: 'download' },
    });

    expect(result.structuredContent).toMatchObject({ method: 'GET', path: '/api/mcp/transfers/backups/app%3Astore/backup.tar.gz' });
  });
});
