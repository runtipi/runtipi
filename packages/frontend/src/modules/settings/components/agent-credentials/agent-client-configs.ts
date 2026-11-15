type ClientConfig = { id: string; label: string; file: string; content: string };

export const getAgentClientConfigs = (endpoint: string): ClientConfig[] => [
  {
    id: 'claude-code',
    label: 'Claude Code',
    file: '.mcp.json',
    content: JSON.stringify(
      { mcpServers: { runtipi: { type: 'http', url: endpoint, headers: { Authorization: 'Bearer ${RUNTIPI_MCP_TOKEN}' } } } },
      null,
      2,
    ),
  },
  {
    id: 'codex',
    label: 'Codex',
    file: '~/.codex/config.toml',
    content: ['[mcp_servers.runtipi]', `url = ${JSON.stringify(endpoint)}`, 'bearer_token_env_var = "RUNTIPI_MCP_TOKEN"'].join('\n'),
  },
  {
    id: 'cursor',
    label: 'Cursor',
    file: '~/.cursor/mcp.json',
    content: JSON.stringify({ mcpServers: { runtipi: { url: endpoint, headers: { Authorization: 'Bearer ${env:RUNTIPI_MCP_TOKEN}' } } } }, null, 2),
  },
  {
    id: 'vscode',
    label: 'VS Code',
    file: '~/.copilot/mcp-config.json',
    content: JSON.stringify(
      {
        mcpServers: { runtipi: { type: 'http', url: endpoint, headers: { Authorization: 'Bearer ${RUNTIPI_MCP_TOKEN}' }, tools: ['*'] } },
      },
      null,
      2,
    ),
  },
];
