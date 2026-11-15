import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { LoggerService } from '@/core/logger/logger.service';
import type { AgentIdentity } from '@/modules/agent-credentials/agent-credentials.service';
import { ToolRegistry } from '../tool-registry';
import { HttpException } from '@nestjs/common';
import { LinksService } from '@/modules/links/links.service';
import { AuthService } from '@/modules/auth/auth.service';
import { McpAccountTools } from '../account-tools';

const identity = fromPartial<AgentIdentity>({ user: { id: 42, username: 'agent-owner@example.com', operator: true }, credentialId: 'credential-42' });

describe('account tools through the SDK client', () => {
  let links: ReturnType<typeof mock<LinksService>>;
  let auth: ReturnType<typeof mock<AuthService>>;
  let logger: ReturnType<typeof mock<LoggerService>>;
  let client: Client;
  let handler: ReturnType<typeof createMcpHandler>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [McpAccountTools, { provide: LoggerService, useValue: mock<LoggerService>() }] })
      .useMocker(mock)
      .compile();

    links = module.get(LinksService);
    auth = module.get(AuthService);
    logger = module.get(LoggerService);

    handler = createMcpHandler(() => {
      const server = new McpServer({ name: 'test-runtipi', version: '1.0.0' });
      const registry = new ToolRegistry(server, identity, logger);
      module.get(McpAccountTools).register(registry, identity);
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

    auth.changePassword.mockResolvedValueOnce(true);
    const accepted = await client.callTool({ name: 'change_password', arguments: { currentPassword: 'current', newPassword: 'new-password' } });

    expect(accepted.isError).not.toBe(true);
    expect(accepted.structuredContent).toEqual({ success: true });

    expect(auth.changePassword).toHaveBeenCalledWith({ userId: 42, currentPassword: 'current', newPassword: 'new-password' });
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

  it('rejects unknown top-level arguments instead of silently ignoring them', async () => {
    const result = await client.callTool({ name: 'list_links', arguments: { unexpected: 'value' } });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain('unexpected');
  });
});
