import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { LoggerService } from '@/core/logger/logger.service';
import type { AgentIdentity } from '@/modules/agent-credentials/agent-credentials.service';
import { ToolRegistry } from '../tool-registry';
import { DockerService } from '@/modules/docker/docker.service';
import { McpSystemTools } from '../system-tools';

const identity = fromPartial<AgentIdentity>({ user: { id: 42, username: 'agent-owner@example.com', operator: true }, credentialId: 'credential-42' });

describe('system tools through the SDK client', () => {
  let docker: ReturnType<typeof mock<DockerService>>;
  let client: Client;
  let handler: ReturnType<typeof createMcpHandler>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [McpSystemTools] })
      .useMocker(() => mock())
      .compile();

    docker = module.get(DockerService);

    handler = createMcpHandler(() => {
      const server = new McpServer({ name: 'test-runtipi', version: '1.0.0' });
      const registry = new ToolRegistry(server, identity, mock<LoggerService>());
      module.get(McpSystemTools).register(registry, identity);
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

  it('validates log bounds before touching Docker', async () => {
    const result = await client.callTool({ name: 'get_logs', arguments: { maxLines: 1000000 } });

    expect(result.isError).toBe(true);
    expect(docker.getLogsSnapshot).not.toHaveBeenCalled();
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

  it('rejects conflicting log aliases before reading logs', async () => {
    const result = await client.callTool({ name: 'get_logs', arguments: { lines: 3, maxLines: 4 } });
    expect(result.isError).toBe(true);
    expect(docker.getLogsSnapshot).not.toHaveBeenCalled();
  });
});
