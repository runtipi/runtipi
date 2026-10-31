import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { fromPartial } from '@total-typescript/shoehorn';
import { type } from 'arktype';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { LoggerService } from '@/core/logger/logger.service';
import type { AgentIdentity } from '@/modules/agent-credentials/agent-credentials.service';
import { ToolRegistry } from '../tool-registry';

const connect = async (register: (registry: ToolRegistry) => void) => {
  const logger = mock<LoggerService>();
  const handler = createMcpHandler(() => {
    const server = new McpServer({ name: 'registry-test', version: '1.0.0' });
    register(new ToolRegistry(server, fromPartial<AgentIdentity>({ user: { id: 42 }, credentialId: 'test-credential' }), logger));
    return server;
  });
  const client = new Client({ name: 'agent', version: '1.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL('http://localhost/api/mcp'), { fetch: (url, init) => handler.fetch(new Request(String(url), init)) }),
  );
  return {
    client,
    logger,
    close: async () => {
      await client.close();
      await handler.close();
    },
  };
};

test('publishes nullable reads and collection responses identically in both output channels', async () => {
  const { client, close } = await connect((registry) => {
    registry.add('read_config', 'Read config', type({}), type({ config: 'string | null' }), () => ({ config: null }), true);
    registry.add('list_values', 'List values', type({}), type({ values: 'string[]' }), () => ({ values: ['value'] }), true);
  });

  try {
    const discovery = await client.listTools();
    expect(discovery.tools.every((tool) => tool.outputSchema?.type === 'object')).toBe(true);
    const nullable = await client.callTool({ name: 'read_config', arguments: {} });
    const collection = await client.callTool({ name: 'list_values', arguments: {} });

    expect(nullable.structuredContent).toEqual({ config: null });
    expect(collection.structuredContent).toEqual({ values: ['value'] });
    for (const result of [nullable, collection]) {
      const text = result.content?.find((content) => content.type === 'text');
      expect(text?.type === 'text' ? JSON.parse(text.text) : null).toEqual(result.structuredContent);
    }
  } finally {
    await close();
  }
});

test('correlates unexpected failures with server diagnostics without logging passwords or error message contents', async () => {
  const { client, logger, close } = await connect((registry) => {
    registry.add('fail', 'Fail', type({ urn: 'string', password: 'string' }), type({ success: 'boolean' }), () => {
      throw Object.assign(new Error('Internal details containing fixture-password\n    at fixture-secret-in-message'), { code: 'ECONNREFUSED' });
    });
  });

  try {
    const result = await client.callTool({ name: 'fail', arguments: { urn: 'app:store', password: 'fixture-password' } });
    expect(result.isError).toBe(true);
    const output = result.structuredContent;
    expect(output).toMatchObject({ error: { diagnosticId: expect.any(String), message: expect.stringContaining('diagnostic ID') } });
    expect(logger.warn).toHaveBeenCalledWith(
      'MCP tool failed',
      expect.objectContaining({
        tool: 'fail',
        target: 'app:store',
        diagnosticId: type({ error: { diagnosticId: 'string' } }).assert(output).error.diagnosticId,
        errorType: 'Error',
        frames: expect.arrayContaining([expect.stringMatching(/^\s+at /)]),
        code: 'ECONNREFUSED',
      }),
    );
    expect(JSON.stringify(result)).not.toContain('Internal details');
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('fixture-password');
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('fixture-secret-in-message');
  } finally {
    await close();
  }
});

test('rejects malformed tool output instead of silently advertising success', async () => {
  const { client, close } = await connect((registry) => {
    registry.add('bad_output', 'Malformed output', type({}), type({ count: 'number >= 0' }), () => ({ count: -1 }), true);
  });

  try {
    const result = await client.callTool({ name: 'bad_output', arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toHaveProperty('error.diagnosticId');
  } finally {
    await close();
  }
});
