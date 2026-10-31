import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import type Dockerode from 'dockerode';
import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { castAppUrn } from '@/common/helpers/app-helpers';
import { DOCKERODE } from '../docker.constants';
import { DockerService } from '../docker.service';

describe('app container diagnostics', () => {
  it('reads stopped and restarting containers without exposing their environment', async () => {
    const client = mock<Dockerode>();
    client.listContainers.mockResolvedValue(
      fromPartial([
        {
          Id: 'container-id',
          Labels: { 'com.docker.compose.service': 'bookstack' },
          Ports: [{ IP: '0.0.0.0', PrivatePort: 80, PublicPort: 8235, Type: 'tcp' }],
        },
      ]),
    );
    client.getContainer.mockReturnValue(
      fromPartial({
        inspect: vi.fn().mockResolvedValue({
          Name: '/bookstack',
          State: { Status: 'restarting', Health: { Status: 'unhealthy' }, ExitCode: 1, StartedAt: '2026-10-31T10:00:00Z' },
          RestartCount: 17,
          Config: { Env: ['APP_KEY=private-key'] },
        }),
      }),
    );
    const module = await Test.createTestingModule({ providers: [DockerService, { provide: DOCKERODE, useValue: client }] })
      .useMocker(() => mock())
      .compile();

    const result = await module.get(DockerService).getAppRuntime(castAppUrn('bookstack:store'));

    expect(client.listContainers).toHaveBeenCalledWith({ all: true, filters: { label: ['com.docker.compose.project=bookstack_store'] } });
    expect(result).toMatchObject([
      { service: 'bookstack', state: 'restarting', health: 'unhealthy', restartCount: 17, exitCode: 1, ports: [{ hostPort: 8235 }] },
    ]);
    expect(JSON.stringify(result)).not.toContain('private-key');
  });
});
