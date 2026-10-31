import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { McpServer } from '@modelcontextprotocol/server';
import { Test } from '@nestjs/testing';
import { type INestApplication, UnauthorizedException } from '@nestjs/common';
import { fromPartial } from '@total-typescript/shoehorn';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import request from 'supertest';
import { type } from 'arktype';
import { AgentCredentialsService, type AgentIdentity } from '@/modules/agent-credentials/agent-credentials.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { BackupsService } from '@/modules/backups/backups.service';
import { CustomAppService } from '@/modules/custom-apps/custom-apps.service';
import { McpController } from '../mcp.controller';
import { McpGuard } from '../mcp.guard';
import { McpService } from '../mcp.service';
import { McpToolsService } from '../mcp-tools.service';
import { McpTransfersController } from '../mcp-transfers.controller';

const identity = fromPartial<AgentIdentity>({ user: { id: 42 }, credentialId: 'agent-42' });

describe('MCP HTTP boundary', () => {
  let app: INestApplication;
  let endpoint: URL;
  let transferDirectory: string;
  const credentials = mock<AgentCredentialsService>();
  const backups = mock<BackupsService>();
  const customApps = mock<CustomAppService>();

  beforeAll(async () => {
    const config = mock<ConfigurationService>();
    config.get.calledWith('userSettings').mockReturnValue(
      fromPartial<ReturnType<ConfigurationService['getConfig']>['userSettings']>({
        domain: 'tipi.example.com',
        localDomain: 'tipi.local',
        internalIp: '127.0.0.1',
      }),
    );
    credentials.authenticate.mockImplementation(async (header) => {
      if (header !== 'Bearer test-agent-token') throw new UnauthorizedException();
      return identity;
    });
    const module = await Test.createTestingModule({
      controllers: [McpController, McpTransfersController],
      providers: [
        McpGuard,
        McpService,
        { provide: AgentCredentialsService, useValue: credentials },
        { provide: ConfigurationService, useValue: config },
        { provide: BackupsService, useValue: backups },
        { provide: CustomAppService, useValue: customApps },
        {
          provide: McpToolsService,
          useValue: {
            createServer: (caller: AgentIdentity) => {
              const server = new McpServer({ name: 'test-runtipi', version: '1.0.0' });
              server.registerTool('whoami', { inputSchema: type({}) }, async () => ({ content: [{ type: 'text', text: String(caller.user.id) }] }));
              return server;
            },
          },
        },
      ],
    }).compile();

    transferDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'runtipi-mcp-transfers-'));
    await fs.writeFile(path.join(transferDirectory, 'backup.tar.gz'), Buffer.from([0x1f, 0x8b, 0x08, 0x00]));

    app = module.createNestApplication();
    app.setGlobalPrefix('/api');
    await app.listen(0, '127.0.0.1');
    endpoint = new URL('/api/mcp', await app.getUrl());
  });

  afterAll(async () => {
    await app?.close();
    if (transferDirectory) await fs.rm(transferDirectory, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it('connects with a real HTTP SDK client and preserves identity across requests', async () => {
    const client = new Client({ name: 'agent', version: '1.0.0' });
    try {
      await client.connect(
        new StreamableHTTPClientTransport(endpoint, {
          requestInit: { headers: { Authorization: 'Bearer test-agent-token', Cookie: 'session=other-user' } },
        }),
      );
      const result = await client.callTool({ name: 'whoami', arguments: {} });

      expect(result.content).toEqual([{ type: 'text', text: '42' }]);
    } finally {
      await client.close();
    }
  });

  it('accepts stateless initialization from a 2025-era client', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/mcp')
      .set('Host', '127.0.0.1')
      .set('Authorization', 'Bearer test-agent-token')
      .set('Accept', 'application/json, text/event-stream')
      .send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'legacy-agent', version: '1.0.0' } },
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain('2025-06-18');
  });

  it.each([undefined, 'Bearer cli-token'])('rejects missing or CLI authentication: %s', async (authorization) => {
    const call = request(app.getHttpServer()).post('/api/mcp').set('Host', '127.0.0.1').set('Cookie', 'session=browser-user');
    if (authorization) call.set('Authorization', authorization);
    const response = await call.send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });

    expect(response.status).toBe(401);
  });

  it('rejects disallowed Origins even with valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/mcp')
      .set('Host', '127.0.0.1')
      .set('Authorization', 'Bearer test-agent-token')
      .set('Origin', 'https://attacker.example')
      .send({});

    expect(response.status).toBe(403);
  });

  it('rejects unconfigured Hosts', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/mcp')
      .set('Host', 'attacker.example')
      .set('Authorization', 'Bearer test-agent-token')
      .send({});

    expect(response.status).toBe(403);
  });

  it('protects transfer routes with the same bearer check', async () => {
    const response = await request(app.getHttpServer()).get('/api/mcp/transfers/backups/app:store/backup.tar.gz').set('Host', '127.0.0.1');

    expect(response.status).toBe(401);
    expect(backups.getBackupFilePath).not.toHaveBeenCalled();
  });

  it('uploads a named archive through the authenticated transfer route', async () => {
    const archive = Buffer.from([0x1f, 0x8b, 0x08, 0x00]);
    const response = await request(app.getHttpServer())
      .post('/api/mcp/transfers/backups/app:store/backup.tar.gz')
      .set('Host', '127.0.0.1')
      .set('Authorization', 'Bearer test-agent-token')
      .attach('file', archive, 'backup.tar.gz');

    expect(response.status).toBe(201);
    expect(backups.uploadBackup).toHaveBeenCalledWith({ appUrn: 'app:store', filename: 'backup.tar.gz', fileBuffer: archive });
  });

  it('streams raw gzip bytes into the backup service', async () => {
    const archive = Buffer.from([0x1f, 0x8b, 0x08, 0x00]);
    let received = Buffer.alloc(0);
    backups.uploadBackupStream.mockImplementationOnce(async ({ source }) => {
      const chunks: Buffer[] = [];
      for await (const chunk of source) chunks.push(Buffer.from(chunk));
      received = Buffer.concat(chunks);
    });

    const response = await request(app.getHttpServer())
      .put('/api/mcp/transfers/backups/app:store/backup.tar.gz')
      .set('Host', '127.0.0.1')
      .set('Authorization', 'Bearer test-agent-token')
      .set('Content-Type', 'application/gzip')
      .send(archive);

    expect(response.status).toBe(200);
    expect(received).toEqual(archive);
  });

  it('streams a backup download without exposing its filesystem path', async () => {
    backups.getBackupFilePath.mockResolvedValue(path.join(transferDirectory, 'backup.tar.gz'));
    const response = await request(app.getHttpServer())
      .get('/api/mcp/transfers/backups/app:store/backup.tar.gz')
      .set('Host', '127.0.0.1')
      .set('Authorization', 'Bearer test-agent-token');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/gzip');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual(Buffer.from([0x1f, 0x8b, 0x08, 0x00]));
  });

  it('rejects mismatched filenames and images that are not JPG', async () => {
    const wrongName = await request(app.getHttpServer())
      .post('/api/mcp/transfers/backups/app:store/backup.tar.gz')
      .set('Host', '127.0.0.1')
      .set('Authorization', 'Bearer test-agent-token')
      .attach('file', Buffer.from('archive'), 'other.tar.gz');
    const wrongImage = await request(app.getHttpServer())
      .post('/api/mcp/transfers/images/app:store')
      .set('Host', '127.0.0.1')
      .set('Authorization', 'Bearer test-agent-token')
      .attach('image', Buffer.from('not-a-jpeg'), { filename: 'image.jpg', contentType: 'image/jpeg' });

    expect(wrongName.status).toBe(400);
    expect(wrongImage.status).toBe(400);
    expect(customApps.uploadAppImage).not.toHaveBeenCalled();
  });

  it('supports disabling MCP access for both tools and transfers', async () => {
    vi.stubEnv('RUNTIPI_MCP_ENABLED', 'false');
    try {
      const response = await request(app.getHttpServer())
        .get('/api/mcp/transfers/backups/app:store/backup.tar.gz')
        .set('Host', '127.0.0.1')
        .set('Authorization', 'Bearer test-agent-token');
      expect(response.status).toBe(503);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
