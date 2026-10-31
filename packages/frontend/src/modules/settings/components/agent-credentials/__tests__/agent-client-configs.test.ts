import { expect, test } from 'vitest';
import { getAgentClientConfigs } from '../agent-client-configs';

test('all copied configs reference credentials outside their files', () => {
  const configs = getAgentClientConfigs('https://tipi.example/api/mcp');
  expect(configs).toHaveLength(4);
  for (const config of configs) expect(config.content).not.toContain('rtm_');
  const claude = JSON.parse(configs.find((config) => config.id === 'claude-code')!.content);
  const cursor = JSON.parse(configs.find((config) => config.id === 'cursor')!.content);
  const vscode = JSON.parse(configs.find((config) => config.id === 'vscode')!.content);
  expect(claude.mcpServers.runtipi.headers.Authorization).toBe('Bearer ${RUNTIPI_MCP_TOKEN}');
  expect(cursor.mcpServers.runtipi.headers.Authorization).toBe('Bearer ${env:RUNTIPI_MCP_TOKEN}');
  expect(configs.find((config) => config.id === 'codex')!.content).toContain('bearer_token_env_var = "RUNTIPI_MCP_TOKEN"');
  expect(configs.find((config) => config.id === 'vscode')!.file).toBe('~/.copilot/mcp-config.json');
  expect(vscode.mcpServers.runtipi.headers.Authorization).toBe('Bearer ${RUNTIPI_MCP_TOKEN}');
  expect(vscode.mcpServers.runtipi.tools).toEqual(['*']);
  expect(vscode).not.toHaveProperty('inputs');
});
