import { SocketManager } from '@/core/socket/socket.service';
import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { DockerService } from '../docker.service';

describe('DockerService', () => {
  let dockerService: DockerService;
  const mockSocketManager = mock<SocketManager>(fromPartial({ init: () => ({ on: vi.fn() }) }));

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [DockerService, { provide: SocketManager, useValue: mockSocketManager }],
    })
      .useMocker(mock)
      .compile();

    dockerService = moduleRef.get(DockerService);
  });

  it('should be defined', () => {
    expect(dockerService).toBeDefined();
  });
});
