import { SocketManager } from '@/core/socket/socket.service';
import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { ServiceInput } from '../builders/schemas';
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

  it('should be able to parse a compose.json file', async () => {
    const composeJson: { services: ServiceInput[] } = {
      services: [
        {
          // @ts-expect-error
          something: 'crazy',
          name: 'ctfd',
          image: 'ctfd/ctfd:3.7.5',
          isMain: true,
          internalPort: 8000,
          environment: {
            UPLOAD_FOLDER: '/var/uploads',
            DATABASE_URL: 'mysql+pymysql://tipi:${CTFD_MYSQL_DB_PASSWORD}@ctfd-db/ctfd',
          },
          dependsOn: ['ctfd-db'],
          volumes: [
            {
              hostPath: '${APP_DATA_DIR}/data/uploads',
              containerPath: '/var/log/CTFd',
            },
            {
              hostPath: '${APP_DATA_DIR}/data/uploads',
              containerPath: '/var/uploads',
            },
          ],
        },
        {
          name: 'ctfd-db',
          image: 'mariadb:10.4.12',
          environment: {
            MYSQL_ROOT_PASSWORD: '${CTFD_MYSQL_ROOT_PASSWORD}',
            MYSQL_USER: 'tipi',
            MYSQL_PASSWORD: '${CTFD_MYSQL_DB_PASSWORD}',
            MYSQL_DATABASE: 'ctfd',
          },
          volumes: [
            {
              hostPath: '${APP_DATA_DIR}/data/db',
              containerPath: '/var/lib/mysql',
            },
          ],
          command: ['mysqld', '--character-set-server=utf8mb4', '--collation-server=utf8mb4_unicode_ci', '--wait_timeout=28800', '--log-warnings=0'],
        },
        {
          name: 'ctfd-redis',
          image: 'redis:4',
          volumes: [
            {
              hostPath: '${APP_DATA_DIR}/data/redis',
              containerPath: '/data',
            },
          ],
        },
      ],
    };

    const yaml = dockerService.getDockerCompose(composeJson.services, { appId: 'test-app', openPort: true });

    expect(yaml).toMatchSnapshot();
  });
});
