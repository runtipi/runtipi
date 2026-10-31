export const getAgentClientConfigs = (endpoint: string, token: string) => {
  const connection = { url: endpoint, headers: { Authorization: `Bearer ${token}` } };
  const httpConnection = { type: 'http', ...connection };

  return [
    {
      id: 'claude-code',
      label: 'Claude Code',
      file: '.mcp.json',
      content: JSON.stringify({ mcpServers: { runtipi: httpConnection } }, null, 2),
    },
    {
      id: 'codex',
      label: 'Codex',
      file: '~/.codex/config.toml',
      content: [
        '[mcp_servers.runtipi]',
        `url = ${JSON.stringify(endpoint)}`,
        `http_headers = { Authorization = ${JSON.stringify(connection.headers.Authorization)} }`,
      ].join('\n'),
    },
    {
      id: 'cursor',
      label: 'Cursor',
      file: '~/.cursor/mcp.json',
      content: JSON.stringify({ mcpServers: { runtipi: connection } }, null, 2),
    },
    {
      id: 'vscode',
      label: 'VS Code',
      file: '.vscode/mcp.json',
      content: JSON.stringify({ servers: { runtipi: httpConnection } }, null, 2),
    },
  ];
};
