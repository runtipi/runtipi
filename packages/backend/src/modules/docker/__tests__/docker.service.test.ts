import { EventEmitter } from 'node:events';
import { Test } from '@nestjs/testing';
import type { AppUrn } from '@runtipi/common/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { DockerService } from '../docker.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppsService } from '@/modules/apps/apps.service';
import { DOCKERODE } from '../docker.constants';
import type Dockerode from 'dockerode';
import type { MockProxy } from 'vitest-mock-extended';
import { fromPartial } from '@total-typescript/shoehorn';

const spawnMock = vi.hoisted(() => vi.fn());
const appUrn = 'store:test' as AppUrn;

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, spawn: spawnMock };
});

describe('DockerService', () => {
  let dockerService: DockerService;
  let files: MockProxy<AppFilesManager>;
  let apps: MockProxy<AppsService>;
  let docker: MockProxy<Dockerode>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [DockerService],
    })
      .useMocker(() => mock())
      .compile();

    dockerService = moduleRef.get(DockerService);
    files = moduleRef.get(AppFilesManager);
    apps = moduleRef.get(AppsService);
    docker = moduleRef.get(DOCKERODE);
    spawnMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should be defined', () => {
    expect(dockerService).toBeDefined();
  });

  it('runs a migration with the app environment in its own project without the app compose or user overrides', async () => {
    vi.stubEnv('COMPOSE_PROFILES', 'optional-service');
    files.getAppEnv.mockResolvedValue({ path: '/data/app.env', content: 'APP_DATA_DIR=/host/data' });
    files.getUserEnv.mockResolvedValue({ path: '/data/user.env', content: 'CUSTOM=value' });
    apps.getApp.mockResolvedValue(fromPartial({ app: { userConfigEnabled: true } }));
    const child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() });
    spawnMock.mockImplementation(() => {
      queueMicrotask(() => child.emit('close', 0));
      return child;
    });
    const migration = { id: '001-password', path: '/data/apps/calcom/migrations/001-password.yml' };

    await dockerService.composeMigration(appUrn, migration, 'run --rm --no-TTY --no-deps migration');

    expect(spawnMock).toHaveBeenCalledWith(
      'docker-compose',
      [
        '--env-file',
        '/data/app.env',
        '--env-file',
        '/data/user.env',
        '--project-name',
        expect.stringMatching(/^runtipi-migration-[0-9a-f]+$/),
        '--file',
        migration.path,
        'run',
        '--rm',
        '--no-TTY',
        '--no-deps',
        'migration',
      ],
      { env: { ...process.env, COMPOSE_PROFILES: '' } },
    );
    expect(process.env.COMPOSE_PROFILES).toBe('optional-service');
    expect(files.getGeneratedDockerComposeYaml).not.toHaveBeenCalled();
    expect(files.getUserComposeFile).not.toHaveBeenCalled();
  });

  it('removes only the isolated project containers and networks without needing source files or env', async () => {
    const container = mock<Dockerode.Container>();
    const network = mock<Dockerode.Network>();
    docker.listContainers.mockResolvedValue([fromPartial({ Id: 'migration-container' })]);
    docker.listNetworks.mockResolvedValue([fromPartial({ Id: 'migration-network' })]);
    docker.getContainer.mockReturnValue(container);
    docker.getNetwork.mockReturnValue(network);
    container.remove.mockResolvedValue(undefined as never);
    network.remove.mockResolvedValue(undefined as never);

    await dockerService.stopAppMigrations(appUrn);

    expect(docker.listContainers).toHaveBeenCalledWith({
      all: true,
      filters: { label: [expect.stringMatching(/^com.docker.compose.project=runtipi-migration-[0-9a-f]+$/)] },
    });
    expect(container.remove).toHaveBeenCalledWith({ force: true });
    expect(network.remove).toHaveBeenCalled();
    expect(files.getAppEnv).not.toHaveBeenCalled();
  });

  it.each([404, 500])('handles migration cleanup races without hiding Docker failures: %s', async (statusCode) => {
    const container = mock<Dockerode.Container>();
    docker.listContainers.mockResolvedValue([fromPartial({ Id: 'migration-container' })]);
    docker.listNetworks.mockResolvedValue([]);
    docker.getContainer.mockReturnValue(container);
    container.remove.mockRejectedValue({ statusCode });

    const cleanup = dockerService.stopAppMigrations(appUrn);
    if (statusCode === 404) {
      await expect(cleanup).resolves.toBeUndefined();
    } else {
      await expect(cleanup).rejects.toEqual({ statusCode });
    }
  });

  it('allows recovery after containers are removed even when network housekeeping fails', async () => {
    docker.listContainers.mockResolvedValue([]);
    docker.listNetworks.mockRejectedValue(new Error('network housekeeping failed'));

    await expect(dockerService.stopAppMigrations(appUrn)).resolves.toBeUndefined();
  });

  it.each(['optional-service', undefined])('preserves the inherited compose profiles for normal commands: %s', async (profiles) => {
    vi.stubEnv('COMPOSE_PROFILES', profiles);
    files.getAppEnv.mockResolvedValue({ path: '/data/app.env', content: 'APP_DATA_DIR=/host/data' });
    files.getUserEnv.mockResolvedValue({ path: '/data/user.env', content: 'COMPOSE_PROFILES=user-service' });
    files.getGeneratedDockerComposeYaml.mockResolvedValue({ path: '/data/docker-compose.yml', content: '' });
    files.getUserComposeFile.mockResolvedValue({ path: '/data/user-compose.yml', content: '' });
    apps.getApp.mockResolvedValue(fromPartial({ app: { userConfigEnabled: true } }));

    const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    spawnMock.mockImplementation(() => {
      queueMicrotask(() => child.emit('close', 0));
      return child;
    });

    await dockerService.composeApp(appUrn, 'up --detach');

    expect(spawnMock).toHaveBeenCalledWith(
      'docker-compose',
      [
        '--env-file',
        '/data/app.env',
        '--env-file',
        '/data/user.env',
        '--project-name',
        'store_test',
        '-f',
        '/data/docker-compose.yml',
        'up',
        '--detach',
      ],
      { env: process.env },
    );
  });

  it('resolves the ordinary app config with inherited profiles', async () => {
    vi.stubEnv('COMPOSE_PROFILES', 'optional-service');
    vi.spyOn(dockerService, 'getBaseComposeArgsApp').mockResolvedValue({ args: [], isCustomConfig: false });
    const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    spawnMock.mockImplementation(() => {
      queueMicrotask(() => {
        child.stdout.emit('data', JSON.stringify({ services: { app: { image: 'example:latest' } } }));
        child.emit('close', 0);
      });
      return child;
    });

    await expect(dockerService.getEffectiveAppServices(appUrn)).resolves.toEqual({ app: { image: 'example:latest' } });
    expect(spawnMock).toHaveBeenCalledWith('docker-compose', ['config', '--format', 'json'], { env: process.env });
  });

  it('preserves significant whitespace split across compose JSON output chunks', async () => {
    vi.spyOn(dockerService, 'getBaseComposeArgsApp').mockResolvedValue({ args: [], isCustomConfig: false });
    const process = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
    process.stdout = new EventEmitter();
    process.stderr = new EventEmitter();
    spawnMock.mockImplementation(() => {
      queueMicrotask(() => {
        process.stdout.emit('data', '{"services":{"migrate":{"command":"echo hello');
        process.stdout.emit('data', ' world"}}}');
        process.emit('close', 0);
      });
      return process;
    });

    await expect(dockerService.getEffectiveAppServices(appUrn)).resolves.toEqual({ migrate: { command: 'echo hello world' } });
  });

  it('preserves UTF-8 characters split across compose JSON output chunks', async () => {
    vi.spyOn(dockerService, 'getBaseComposeArgsApp').mockResolvedValue({ args: [], isCustomConfig: false });
    const process = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
    process.stdout = new EventEmitter();
    process.stderr = new EventEmitter();
    const output = Buffer.from(JSON.stringify({ services: { migrate: { command: 'echo café' } } }));
    const accentStart = output.indexOf(Buffer.from('é'));
    spawnMock.mockImplementation(() => {
      queueMicrotask(() => {
        process.stdout.emit('data', output.subarray(0, accentStart + 1));
        process.stdout.emit('data', output.subarray(accentStart + 1));
        process.emit('close', 0);
      });
      return process;
    });

    await expect(dockerService.getEffectiveAppServices(appUrn)).resolves.toEqual({ migrate: { command: 'echo café' } });
  });
});
