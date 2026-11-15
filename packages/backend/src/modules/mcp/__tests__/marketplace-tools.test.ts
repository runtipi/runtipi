import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { LoggerService } from '@/core/logger/logger.service';
import type { AgentIdentity } from '@/modules/agent-credentials/agent-credentials.service';
import { ToolRegistry } from '../tool-registry';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import { McpMarketplaceTools } from '../marketplace-tools';

const identity = fromPartial<AgentIdentity>({ user: { id: 42, username: 'agent-owner@example.com', operator: true }, credentialId: 'credential-42' });

describe('marketplace tools through the SDK client', () => {
  let marketplace: ReturnType<typeof mock<MarketplaceService>>;
  let client: Client;
  let handler: ReturnType<typeof createMcpHandler>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [McpMarketplaceTools] })
      .useMocker(mock)
      .compile();

    marketplace = module.get(MarketplaceService);

    handler = createMcpHandler(() => {
      const server = new McpServer({ name: 'test-runtipi', version: '1.0.0' });
      const registry = new ToolRegistry(server, identity, mock<LoggerService>());
      module.get(McpMarketplaceTools).register(registry);
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

  it('forwards store changes and returns a successful MCP response', async () => {
    const result = await client.callTool({ name: 'update_app_store', arguments: { id: 'store', settings: { name: 'Store', enabled: true } } });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({ success: true });
    expect(marketplace.updateAppStore).toHaveBeenCalledWith('store', { name: 'Store', enabled: true });
  });
});
