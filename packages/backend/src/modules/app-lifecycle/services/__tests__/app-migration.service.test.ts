import fs from 'node:fs';
import path from 'node:path';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { BackupManager } from '@/modules/backups/backup.manager';
import type { EffectiveAppServices } from '@/modules/docker/compose-config';
import { DockerService } from '@/modules/docker/docker.service';
import type { AppUrn } from '@runtipi/common/types';
import { fromPartial } from '@total-typescript/shoehorn';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AppMigrationService } from '../app-migration.service';

const appUrn = 'demo:test' as AppUrn;
const migrationDirectory = '/data/apps/test/demo/migrations';
const hostDataPath = '/opt/runtipi/app-data/test/demo';

const writeMigration = async (id: string, content = 'services:\n  migration:\n    image: example/migrate:latest\n') => {
  await fs.promises.mkdir(migrationDirectory, { recursive: true });
  await fs.promises.writeFile(path.join(migrationDirectory, `${id}.yml`), content);
};

const setup = async (ids = ['002-database']) => {
  const repository = mock<AppsRepository>();
  const docker = mock<DockerService>();
  const backups = mock<BackupManager>();
  const logger = mock<LoggerService>();
  const config = mock<ConfigurationService>();
  const state = { initialized: false, migrationIds: [] as string[] };
  const services: EffectiveAppServices = {
    app: { volumes: [{ type: 'bind', source: `${hostDataPath}/database`, target: '/var/lib/database' }] },
  };
  const migrationServices: EffectiveAppServices = { migration: { image: 'example/migrate:latest' } };

  config.getConfig.mockReturnValue(
    fromPartial({
      directories: { dataDir: '/data', appDataDir: '/app-data' },
      userSettings: { appDataPath: '/opt/runtipi' },
    }),
  );
  const files = new AppFilesManager(config, new FilesystemService(logger), logger);

  for (const id of ids) await writeMigration(id);

  docker.getEffectiveAppServices.mockResolvedValue(services);
  docker.getEffectiveMigrationServices.mockResolvedValue(migrationServices);
  repository.getMigrationState.mockImplementation(async () => state);
  repository.baselineMigrations.mockImplementation(async (_appUrn, migrationIds) => {
    if (!state.initialized) {
      state.initialized = true;
      state.migrationIds.push(...migrationIds);
    }
  });

  const createService = () => new AppMigrationService(files, repository, docker, backups, logger);

  return { service: createService(), createService, files, repository, docker, backups, logger, state, services, migrationServices };
};

test('discovers migration files in filename order and prepares only pending images', async () => {
  const { service, state, docker } = await setup(['010-files', '002-database', '001-old']);
  state.migrationIds.push('001-old');
  await fs.promises.writeFile(path.join(migrationDirectory, 'README.md'), 'Operator notes');

  const pending = await service.prepareMigrations(appUrn);

  expect(pending.map((migration) => migration.id)).toEqual(['002-database', '010-files']);
  expect(docker.composeMigration.mock.calls.map(([, migration, command]) => [migration.id, command])).toEqual([
    ['002-database', 'pull migration'],
    ['010-files', 'pull migration'],
  ]);
});

test('skips Compose and ledger reads when the migrations folder is absent', async () => {
  const { service, docker, repository } = await setup([]);

  await expect(service.prepareMigrations(appUrn)).resolves.toEqual([]);
  expect(docker.getEffectiveAppServices).not.toHaveBeenCalled();
  expect(repository.getMigrationState).not.toHaveBeenCalled();
});

test('baselines installed files once without running historical migrations', async () => {
  const { service, state, docker } = await setup(['001-old']);

  await service.baselineCurrentMigrations(appUrn);
  await writeMigration('002-database');
  await service.baselineCurrentMigrations(appUrn);

  expect(state.migrationIds).toEqual(['001-old']);
  expect(docker.getEffectiveAppServices).not.toHaveBeenCalled();
  expect((await service.prepareMigrations(appUrn)).map((migration) => migration.id)).toEqual(['002-database']);
});

test('does not parse completed migrations or enforce storage restrictions for them', async () => {
  const { service, state, services, docker } = await setup();
  state.migrationIds.push('002-database');
  services.app = { volumes: [{ type: 'volume', source: 'database', target: '/data' }] };
  await writeMigration('002-database', 'invalid historical compose');

  await expect(service.prepareMigrations(appUrn)).resolves.toEqual([]);
  expect(docker.getEffectiveAppServices).not.toHaveBeenCalled();
  expect(docker.getEffectiveMigrationServices).not.toHaveBeenCalled();
});

test.each(['Bad-name.yml', 'migration with spaces.yml', 'migration.yaml'])('rejects invalid migration filenames: %s', async (filename) => {
  const { service } = await setup([]);
  await fs.promises.mkdir(migrationDirectory, { recursive: true });
  await fs.promises.writeFile(path.join(migrationDirectory, filename), '');

  await expect(service.prepareMigrations(appUrn)).rejects.toThrow(/Invalid app migration file|Use the .yml extension/);
});

test.each(['folder', 'file'])('rejects a symlink replacing the migration %s', async (target) => {
  const { service } = await setup([]);
  await fs.promises.mkdir('/outside', { recursive: true });
  await fs.promises.writeFile('/outside/migration.yml', '');
  await fs.promises.mkdir(path.dirname(migrationDirectory), { recursive: true });
  if (target === 'folder') {
    await fs.promises.symlink('/outside', migrationDirectory);
  } else {
    await fs.promises.mkdir(migrationDirectory);
    await fs.promises.symlink('/outside/migration.yml', path.join(migrationDirectory, '001-migration.yml'));
  }

  await expect(service.prepareMigrations(appUrn)).rejects.toThrow(/must be a directory|Invalid app migration file/);
});

test.each([
  ['named volume', { type: 'volume', source: 'database', target: '/data' }],
  ['anonymous volume', { type: 'volume', target: '/data' }],
  ['external bind', { type: 'bind', source: '/external/database', target: '/data' }],
  ['container path', { type: 'bind', source: '/app-data/test/demo/database', target: '/data' }],
  ['traversal', { type: 'bind', source: `${hostDataPath}/../outside`, target: '/data' }],
  ['similar prefix', { type: 'bind', source: `${hostDataPath}-other`, target: '/data' }],
])('rejects unbacked app storage: %s', async (_name, volume) => {
  const { service, services, docker } = await setup();
  services.app = { volumes: [volume] };

  await expect(service.prepareMigrations(appUrn)).rejects.toThrow('unsupported writable storage');
  expect(docker.composeMigration).not.toHaveBeenCalled();
});

test('rejects migration storage that the app backup cannot restore', async () => {
  const { service, migrationServices } = await setup();
  migrationServices.migration = { image: 'example:latest', volumes: [{ type: 'bind', source: '/external', target: '/data' }] };

  await expect(service.prepareMigrations(appUrn)).rejects.toThrow('unsupported writable storage');
});

test.each(['app', 'migration'])('rejects volumes_from on %s', async (name) => {
  const { service, services, migrationServices } = await setup();
  const effective = name === 'app' ? services : migrationServices;
  effective[name] = { image: 'example:latest', volumes_from: ['database:rw'] };

  await expect(service.prepareMigrations(appUrn)).rejects.toThrow('volumes_from');
});

test('accepts readonly and ephemeral mounts alongside backed-up data', async () => {
  const { service, migrationServices } = await setup();
  migrationServices.migration = {
    image: 'example:latest',
    tmpfs: ['/tmp'],
    volumes: [
      { type: 'volume', source: 'reference', target: '/reference', read_only: true },
      { type: 'tmpfs', target: '/cache' },
      { type: 'bind', source: `${hostDataPath}/database`, target: '/data' },
    ],
  };

  expect(await service.prepareMigrations(appUrn)).toHaveLength(1);
});

const invalidMigrationServices: EffectiveAppServices[] = [
  {},
  { other: { image: 'example:latest' } },
  { migration: {} },
  { migration: { image: 'example:latest' }, database: { image: 'postgres:16' } },
];

test.each(invalidMigrationServices)('requires exactly one migration service with an image: %j', async (services) => {
  const { service, docker } = await setup();
  docker.getEffectiveMigrationServices.mockResolvedValue(services);

  await expect(service.prepareMigrations(appUrn)).rejects.toThrow('exactly one service named migration');
  expect(docker.composeMigration).not.toHaveBeenCalled();
});

test('executes the prepared batch in order, then removes its isolated resources', async () => {
  const { service, files, docker, repository } = await setup(['002-database', '010-files']);
  const migrations = await files.getAppMigrations(appUrn);

  await service.runMigrations(appUrn, migrations);

  expect(docker.composeMigration.mock.calls.map(([, migration, command]) => [migration.id, command])).toEqual([
    ['002-database', 'run --rm --no-TTY --no-deps migration'],
    ['010-files', 'run --rm --no-TTY --no-deps migration'],
  ]);
  expect(docker.stopAppMigrations).toHaveBeenCalledWith(appUrn);
  expect(repository.completeMigrations).not.toHaveBeenCalled();
});

test('stops a failed batch without running later files or committing it', async () => {
  const { service, files, docker, repository } = await setup(['002-database', '010-files']);
  docker.composeMigration.mockRejectedValueOnce(new Error('migration failed'));

  await expect(service.runMigrations(appUrn, await files.getAppMigrations(appUrn))).rejects.toThrow('migration failed');
  expect(docker.composeMigration).toHaveBeenCalledTimes(1);
  expect(repository.completeMigrations).not.toHaveBeenCalled();
});

test('recovers an interrupted batch after its migration files have disappeared', async () => {
  const { service, createService, files, repository, backups, docker } = await setup();
  const app = fromPartial<NonNullable<Awaited<ReturnType<AppsRepository['getAppByUrn']>>>>({ migrationRecovery: null });
  repository.getAppByUrn.mockImplementation(async () => app);
  repository.setMigrationRecovery.mockImplementation(async (_appUrn, recovery) => {
    app.migrationRecovery = recovery;
  });

  await service.beginMigrationBatch(appUrn, 'recovery.tar.gz', await files.getAppMigrations(appUrn));
  await fs.promises.rm(migrationDirectory, { recursive: true });
  docker.stopAppMigrations.mockImplementation(async () => {
    expect(backups.restoreApp).not.toHaveBeenCalled();
  });
  await createService().reconcile(appUrn);

  expect(app.migrationRecovery).toEqual({ backupFilename: 'recovery.tar.gz', migrationIds: ['002-database'] });
  expect(docker.stopAppMigrations).toHaveBeenCalledWith(appUrn);
  expect(docker.composeApp).toHaveBeenCalledWith(appUrn, 'down --remove-orphans');
  expect(backups.restoreApp).toHaveBeenCalledWith(appUrn, 'recovery.tar.gz');
});

test.each(['migration stop', 'app stop', 'restore'])('retains the recovery reference when %s fails', async (failure) => {
  const { service, repository, backups, docker } = await setup();
  repository.getAppByUrn.mockResolvedValue(fromPartial({ migrationRecovery: { backupFilename: 'recovery.tar.gz', migrationIds: ['002-database'] } }));
  if (failure === 'migration stop') docker.stopAppMigrations.mockRejectedValue(new Error(failure));
  if (failure === 'app stop') docker.composeApp.mockRejectedValue(new Error(failure));
  if (failure === 'restore') backups.restoreApp.mockRejectedValue(new Error(failure));

  await expect(service.reconcile(appUrn)).rejects.toThrow(failure);
  expect(repository.setMigrationRecovery).not.toHaveBeenCalled();
  if (failure !== 'restore') expect(backups.restoreApp).not.toHaveBeenCalled();
});

test('logs failed recovery and stops migration containers before discarding it for uninstall', async () => {
  const { service, docker, backups, logger } = await setup();
  const failure = new Error('recovery unavailable');

  await service.discardRecovery(appUrn, failure);

  expect(logger.warn).toHaveBeenCalledWith(`Discarding failed recovery for ${appUrn} before uninstall`, failure);
  expect(docker.stopAppMigrations).toHaveBeenCalledWith(appUrn);
  expect(backups.restoreApp).not.toHaveBeenCalled();
});

test('does not discard recovery when migration containers cannot be stopped', async () => {
  const { service, docker } = await setup();
  docker.stopAppMigrations.mockRejectedValue(new Error('Docker unavailable'));

  await expect(service.discardRecovery(appUrn, new Error('recovery unavailable'))).rejects.toThrow('Docker unavailable');
});
