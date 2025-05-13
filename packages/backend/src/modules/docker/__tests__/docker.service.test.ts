import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { DockerService } from '../docker.service.js';

describe('DockerService', () => {
  let dockerService: DockerService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [DockerService],
    })
      .useMocker(mock)
      .compile();

    dockerService = moduleRef.get(DockerService);
  });

  it('should be defined', () => {
    expect(dockerService).toBeDefined();
  });
});
