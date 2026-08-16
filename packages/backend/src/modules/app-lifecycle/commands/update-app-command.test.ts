import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppHelpers } from '@/modules/apps/app.helpers';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import { SubnetManagerService } from '@/modules/network/subnet-manager.service';
import { convertLegacyToYaml } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';
import type { ModuleRef } from '@nestjs/core';
import type Dockerode from 'dockerode';
import { expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { UpdateAppCommand } from './update-app-command';

const appUrn = 'app:test' as AppUrn;

const createCommand = (
  options: { performBackup?: boolean; wasRunningBeforeUpdate?: boolean; stubEnsureAppDir?: boolean; initialSubnet?: string | null } = {},
) => {
  const logger = mock<LoggerService>();
  const appFilesManager = mock<AppFilesManager>();
  const dockerService = mock<DockerService>();
  const marketplaceService = mock<MarketplaceService>();
  const appHelpers = mock<AppHelpers>();
  const backupManager = mock<BackupManager>();
  const appsRepository = mock<AppsRepository>();
  const config = mock<ConfigurationService>();
  const filesystem = mock<FilesystemService>();
  const docker = mock<Dockerode>();
  const appState = { id: 1, subnet: options.initialSubnet ?? (null as string | null), maxBackups: null };
  const subnetManager = new SubnetManagerService(appsRepository, logger, docker);

  dockerService.composeApp.mockResolvedValue({ success: true, stdout: '', stderr: '' });
  docker.listNetworks.mockResolvedValue([]);
  marketplaceService.getSourceDockerComposeYaml.mockResolvedValue({
    path: '/app/apps/test/docker-compose.yml',
    content: convertLegacyToYaml({
      schemaVersion: 2,
      services: [{ name: 'app', image: 'nginx:latest', isMain: true, internalPort: 80 }],
    }),
  });
  appFilesManager.getSourceDockerComposeYaml.mockResolvedValue({
    path: '/data/apps/test/docker-compose.yml',
    content: convertLegacyToYaml({
      schemaVersion: 2,
      services: [{ name: 'app', image: 'nginx:latest', isMain: true, internalPort: 80 }],
    }),
  });
  appFilesManager.getAppPaths.mockReturnValue({ appDataDir: '/data/app-data/test', appInstalledDir: '/data/apps/test' });
  appFilesManager.getAppEnv.mockResolvedValue({ path: '/data/app-data/test/app.env', content: 'OLD_ENV=value' });
  appFilesManager.deleteAppFolder.mockResolvedValue(true);
  appFilesManager.writeAppEnv.mockResolvedValue(true);
  marketplaceService.copyAppFromRepoToInstalled.mockResolvedValue(undefined);
  appHelpers.generateEnvFile.mockResolvedValue(undefined);
  backupManager.backupApp.mockResolvedValue(undefined);
  backupManager.cleanupOldBackups.mockResolvedValue(undefined);
  appsRepository.getAppByUrn.mockImplementation(async () => appState as Awaited<ReturnType<AppsRepository['getAppByUrn']>>);
  appsRepository.getApps.mockImplementation(async () => [appState] as Awaited<ReturnType<AppsRepository['getApps']>>);
  appsRepository.updateAppById.mockImplementation(async (_id, update) => {
    if ('subnet' in update && update.subnet !== undefined) {
      appState.subnet = update.subnet;
    }
    return appState as Awaited<ReturnType<AppsRepository['updateAppById']>>;
  });
  config.get.calledWith('userSettings').mockReturnValue({ maxBackups: 7 } as never);
  filesystem.createTempDirectory.mockResolvedValue('/tmp/runtipi-update-abc');
  filesystem.copyDirectory.mockResolvedValue(true);
  filesystem.removeDirectory.mockResolvedValue(true);
  filesystem.writePrivateTextFile.mockResolvedValue(true);
  filesystem.readTextFile.mockResolvedValue(JSON.stringify({ content: 'OLD_ENV=value' }));
  filesystem.isFile.mockResolvedValue(true);

  const services = new Map<unknown, unknown>([
    [LoggerService, logger],
    [AppFilesManager, appFilesManager],
    [DockerService, dockerService],
    [MarketplaceService, marketplaceService],
    [AppHelpers, appHelpers],
    [BackupManager, backupManager],
    [AppsRepository, appsRepository],
    [ConfigurationService, config],
    [FilesystemService, filesystem],
    [SubnetManagerService, subnetManager],
  ]);

  const moduleRef = { get: (token: unknown) => services.get(token) } as ModuleRef;
  const command = new UpdateAppCommand(moduleRef, docker, options.performBackup ?? true, options.wasRunningBeforeUpdate ?? false);
  const ensureAppDir =
    options.stubEnsureAppDir === false
      ? undefined
      : vi.spyOn(command as UpdateAppCommand & { ensureAppDir: (...args: unknown[]) => Promise<void> }, 'ensureAppDir').mockResolvedValue(undefined);

  return {
    command,
    dockerService,
    logger,
    marketplaceService,
    appFilesManager,
    appHelpers,
    backupManager,
    filesystem,
    ensureAppDir,
    appsRepository,
    appState,
  };
};

test('pulls the target images before stopping or removing the existing deployment', async () => {
  const { command, dockerService, backupManager, filesystem, ensureAppDir } = createCommand();

  const result = await command.execute(appUrn, {});

  expect(result).toEqual({ success: true, message: `App ${appUrn} updated successfully` });
  expect(dockerService.composeApp.mock.calls.map(([, command]) => command)).toEqual(['pull', 'stop', 'down --remove-orphans']);
  expect(dockerService.composeApp).not.toHaveBeenCalledWith(appUrn, expect.stringContaining('--rmi all'));
  expect(backupManager.cleanupOldBackups).toHaveBeenCalledWith(appUrn, 7);
  expect(filesystem.copyDirectory).toHaveBeenNthCalledWith(1, '/data/apps/test', '/tmp/runtipi-update-abc/previous-app');
  expect(filesystem.copyDirectory).toHaveBeenNthCalledWith(2, '/tmp/runtipi-update-abc/previous-app', '/data/apps/test');
  expect(ensureAppDir).toHaveBeenCalledWith(appUrn, {}, { pruneContainers: false, persistSubnet: false });
});

test('does not allocate a subnet when a preflight pull fails', async () => {
  const { command, dockerService, appsRepository, appState } = createCommand({ stubEnsureAppDir: false });
  dockerService.composeApp.mockRejectedValueOnce(new Error('registry unavailable'));

  const result = await command.execute(appUrn, {});

  expect(result).toEqual({ success: false, message: 'registry unavailable', rollbackSucceeded: true });
  expect(appState.subnet).toBeNull();
  expect(appsRepository.updateAppById).not.toHaveBeenCalled();
});

test('keeps the original subnet in the database and restored compose when final target generation fails', async () => {
  const originalSubnet = '10.128.42.0/24';
  const { command, appFilesManager, appHelpers, appsRepository, appState, marketplaceService } = createCommand({
    initialSubnet: originalSubnet,
    stubEnsureAppDir: false,
    wasRunningBeforeUpdate: true,
  });
  const multiServiceCompose = convertLegacyToYaml({
    schemaVersion: 2,
    services: [
      { name: 'app', image: 'nginx:latest', isMain: true, internalPort: 80 },
      { name: 'worker', image: 'nginx:latest' },
    ],
  });
  marketplaceService.getSourceDockerComposeYaml.mockResolvedValue({ path: '/app/apps/test/docker-compose.yml', content: multiServiceCompose });
  appFilesManager.getSourceDockerComposeYaml.mockResolvedValue({ path: '/data/apps/test/docker-compose.yml', content: multiServiceCompose });
  appHelpers.generateEnvFile.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('target environment unavailable'));

  const result = await command.execute(appUrn, {});

  expect(result).toEqual({ success: false, message: 'target environment unavailable', rollbackSucceeded: true });
  expect(appState.subnet).toBe(originalSubnet);
  expect(appsRepository.updateAppById).not.toHaveBeenCalled();
  expect(appFilesManager.writeDockerComposeYml.mock.calls.map(([, compose]) => compose)).toHaveLength(3);
  for (const [, compose] of appFilesManager.writeDockerComposeYml.mock.calls) {
    expect(compose).toContain(originalSubnet);
  }
});

test('restores a legacy null subnet after final target generation fails', async () => {
  const { command, appHelpers, appsRepository, appState } = createCommand({ stubEnsureAppDir: false, wasRunningBeforeUpdate: true });
  appHelpers.generateEnvFile.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('target environment unavailable'));

  const result = await command.execute(appUrn, {});

  expect(result).toEqual({ success: false, message: 'target environment unavailable', rollbackSucceeded: true });
  expect(appState.subnet).toBeNull();
  expect(appsRepository.updateAppById).toHaveBeenCalledWith(1, { subnet: '10.128.10.0/24' });
  expect(appsRepository.updateAppById).toHaveBeenLastCalledWith(1, { subnet: null });
});

test('persists a subnet for a legacy null-subnet app after a successful update', async () => {
  const { command, appsRepository, appState } = createCommand({ stubEnsureAppDir: false });

  const result = await command.execute(appUrn, {});

  expect(result).toEqual({ success: true, message: `App ${appUrn} updated successfully` });
  expect(appState.subnet).toBe('10.128.10.0/24');
  expect(appsRepository.updateAppById).toHaveBeenCalledTimes(1);
  expect(appsRepository.updateAppById).toHaveBeenCalledWith(1, { subnet: '10.128.10.0/24' });
});

test('restores the previous app files and leaves containers alone when the preflight pull fails', async () => {
  const { command, dockerService, appFilesManager, filesystem, ensureAppDir } = createCommand();
  dockerService.composeApp.mockRejectedValueOnce(new Error('registry unavailable'));

  const result = await command.execute(appUrn, {});

  expect(result).toEqual({ success: false, message: 'registry unavailable', rollbackSucceeded: true });
  expect(dockerService.composeApp).toHaveBeenCalledWith(appUrn, 'pull');
  expect(dockerService.composeApp).not.toHaveBeenCalledWith(appUrn, 'stop');
  expect(dockerService.composeApp).not.toHaveBeenCalledWith(appUrn, 'down --remove-orphans');
  expect(filesystem.copyDirectory).toHaveBeenNthCalledWith(2, '/tmp/runtipi-update-abc/previous-app', '/data/apps/test');
  expect(appFilesManager.writeAppEnv).toHaveBeenCalledWith(appUrn, 'OLD_ENV=value');
  expect(ensureAppDir).toHaveBeenCalledWith(appUrn, {}, { pruneContainers: false, persistSubnet: false });
});

test.each([
  [
    'copying the target app files',
    (setup: ReturnType<typeof createCommand>) =>
      setup.marketplaceService.copyAppFromRepoToInstalled.mockRejectedValueOnce(new Error(`Failed to copy app ${appUrn} from repo test`)),
    `Failed to copy app ${appUrn} from repo test`,
  ],
  [
    'writing the generated target compose file',
    (setup: ReturnType<typeof createCommand>) =>
      setup.ensureAppDir?.mockRejectedValueOnce(new Error(`Failed to write generated docker compose file for app ${appUrn}`)),
    `Failed to write generated docker compose file for app ${appUrn}`,
  ],
  [
    'writing the generated target environment',
    (setup: ReturnType<typeof createCommand>) =>
      setup.appHelpers.generateEnvFile.mockRejectedValueOnce(new Error(`Failed to write app environment for ${appUrn}`)),
    `Failed to write app environment for ${appUrn}`,
  ],
])('restores the previous state and does not deploy when preflight fails while %s', async (_description, failPreflight, message) => {
  const setup = createCommand();
  failPreflight(setup);

  const result = await setup.command.execute(appUrn, {});

  expect(result).toEqual({ success: false, message, rollbackSucceeded: true });
  expect(setup.dockerService.composeApp).not.toHaveBeenCalled();
  expect(setup.filesystem.copyDirectory).toHaveBeenNthCalledWith(2, '/tmp/runtipi-update-abc/previous-app', '/data/apps/test');
  expect(setup.appFilesManager.writeAppEnv).toHaveBeenCalledWith(appUrn, 'OLD_ENV=value');
});

test('restores the previous deployment instead of starting the target when the final app copy fails', async () => {
  const { command, dockerService, marketplaceService } = createCommand({ wasRunningBeforeUpdate: true });
  marketplaceService.copyAppFromRepoToInstalled
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error(`Failed to copy app ${appUrn} from repo test`));

  const result = await command.execute(appUrn, {});

  expect(result).toEqual({ success: false, message: `Failed to copy app ${appUrn} from repo test`, rollbackSucceeded: true });
  expect(dockerService.composeApp.mock.calls.map(([, composeCommand]) => composeCommand)).toEqual([
    'pull',
    'stop',
    'down --remove-orphans',
    'up --detach --force-recreate --remove-orphans',
  ]);
});

test('persists and restores the previous environment from the durable recovery snapshot', async () => {
  const { command, dockerService, appFilesManager, filesystem } = createCommand();
  dockerService.composeApp.mockRejectedValueOnce(new Error('registry unavailable'));
  filesystem.readTextFile.mockResolvedValue(JSON.stringify({ content: 'DURABLE_ENV=value' }));

  await command.execute(appUrn, {});

  expect(filesystem.writePrivateTextFile).toHaveBeenCalledWith(
    '/tmp/runtipi-update-abc/previous-app.env.json',
    JSON.stringify({ content: 'OLD_ENV=value' }),
  );
  expect(appFilesManager.writeAppEnv).toHaveBeenCalledWith(appUrn, 'DURABLE_ENV=value');
});

test('retains the recovery snapshot when restoring the previous environment fails', async () => {
  const { command, dockerService, appFilesManager, filesystem } = createCommand();
  dockerService.composeApp.mockRejectedValueOnce(new Error('registry unavailable'));
  appFilesManager.writeAppEnv.mockResolvedValue(false);

  const result = await command.execute(appUrn, {});

  expect(result).toEqual({
    success: false,
    message:
      'registry unavailable. Recovery failed; the previous app files are retained at /tmp/runtipi-update-abc. After recovering the app, remove this directory manually.',
    rollbackSucceeded: false,
    recoverySnapshotPath: '/tmp/runtipi-update-abc',
  });
  expect(filesystem.removeDirectory).not.toHaveBeenCalled();
});

test('durably records a missing environment file and restores its absence', async () => {
  const { command, dockerService, appFilesManager, filesystem } = createCommand();
  appFilesManager.getAppEnv.mockResolvedValue({ path: '/data/app-data/test/app.env', content: null });
  dockerService.composeApp.mockRejectedValueOnce(new Error('registry unavailable'));
  filesystem.readTextFile.mockResolvedValue(JSON.stringify({ content: null }));

  await command.execute(appUrn, {});

  expect(filesystem.writePrivateTextFile).toHaveBeenCalledWith('/tmp/runtipi-update-abc/previous-app.env.json', JSON.stringify({ content: null }));
  expect(filesystem.removeFile).toHaveBeenCalledWith('/data/app-data/test/app.env');
});

test.each([
  [
    'cannot read the current environment',
    (setup: ReturnType<typeof createCommand>) => setup.appFilesManager.getAppEnv.mockRejectedValue(new Error('env unavailable')),
  ],
  [
    'cannot create a staging directory',
    (setup: ReturnType<typeof createCommand>) => setup.filesystem.createTempDirectory.mockRejectedValue(new Error('temp unavailable')),
  ],
])('reports rollback success when setup %s before changing the deployment', async (_description, failSetup) => {
  const setup = createCommand();
  failSetup(setup);

  const result = await setup.command.execute(appUrn, {});

  expect(result).toEqual({ success: false, message: expect.stringMatching(/(env|temp) unavailable/), rollbackSucceeded: true });
  expect(setup.marketplaceService.copyAppFromRepoToInstalled).not.toHaveBeenCalled();
  expect(setup.dockerService.composeApp).not.toHaveBeenCalled();
});

test('does not report a null recovery path when recovery fails before staging', async () => {
  const setup = createCommand();
  setup.filesystem.createTempDirectory.mockRejectedValue(new Error('temp unavailable'));
  setup.appsRepository.getAppByUrn.mockResolvedValueOnce(setup.appState as Awaited<ReturnType<AppsRepository['getAppByUrn']>>);
  setup.appsRepository.getAppByUrn.mockRejectedValueOnce(new Error('subnet unavailable'));

  const result = await setup.command.execute(appUrn, {});

  expect(result).toEqual({
    success: false,
    message: 'temp unavailable. Recovery failed before a recovery snapshot could be retained.',
    rollbackSucceeded: false,
  });
  expect(result).not.toHaveProperty('recoverySnapshotPath');
});

test('starts the restored deployment when an update fails after a backup stopped a running app', async () => {
  const { command, dockerService } = createCommand({ wasRunningBeforeUpdate: true });
  dockerService.composeApp.mockImplementation(async (_appUrn, composeCommand) => {
    if (composeCommand === 'down --remove-orphans') {
      throw new Error('failed to stop old deployment');
    }
    return { success: true, stdout: '', stderr: '' };
  });

  const result = await command.execute(appUrn, {});

  expect(result).toEqual({ success: false, message: 'failed to stop old deployment', rollbackSucceeded: true });
  expect(dockerService.composeApp).toHaveBeenLastCalledWith(appUrn, 'up --detach --force-recreate --remove-orphans');
});

test('rolls back a target startup failure before reporting the update as failed', async () => {
  const { command, dockerService, filesystem } = createCommand({ wasRunningBeforeUpdate: true });
  let starts = 0;
  dockerService.composeApp.mockImplementation(async (_appUrn, composeCommand) => {
    if (composeCommand === 'up --detach --force-recreate --remove-orphans' && ++starts === 1) {
      throw new Error('new version did not start');
    }
    return { success: true, stdout: '', stderr: '' };
  });

  const result = await command.execute(appUrn, {});

  expect(result).toEqual({ success: false, message: 'new version did not start', rollbackSucceeded: true });
  expect(dockerService.composeApp.mock.calls.map(([, composeCommand]) => composeCommand)).toEqual([
    'pull',
    'stop',
    'down --remove-orphans',
    'up --detach --force-recreate --remove-orphans',
    'up --detach --force-recreate --remove-orphans',
  ]);
  expect(filesystem.removeDirectory).toHaveBeenCalledWith('/tmp/runtipi-update-abc');
});

test('logs a retained recovery snapshot when cleanup fails after a successful update', async () => {
  const { command, filesystem, logger } = createCommand();
  filesystem.removeDirectory.mockResolvedValue(false);

  const result = await command.execute(appUrn, {});

  expect(result).toEqual({ success: true, message: `App ${appUrn} updated successfully` });
  expect(logger.error).toHaveBeenCalledWith(
    expect.stringContaining('Failed to remove recovery snapshot for app app:test at /tmp/runtipi-update-abc'),
  );
});

test('retains the recovery snapshot when rollback startup fails', async () => {
  const { command, dockerService, filesystem, logger } = createCommand({ wasRunningBeforeUpdate: true });
  dockerService.composeApp.mockImplementation(async (_appUrn, composeCommand) => {
    if (composeCommand === 'up --detach --force-recreate --remove-orphans') {
      throw new Error('unable to start deployment');
    }
    return { success: true, stdout: '', stderr: '' };
  });

  const result = await command.execute(appUrn, {});

  expect(result).toEqual({
    success: false,
    message:
      'unable to start deployment. Recovery failed; the previous app files are retained at /tmp/runtipi-update-abc. After recovering the app, remove this directory manually.',
    rollbackSucceeded: false,
    recoverySnapshotPath: '/tmp/runtipi-update-abc',
  });
  expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Recovery snapshot retained at /tmp/runtipi-update-abc'), expect.any(Error));
  expect(filesystem.removeDirectory).not.toHaveBeenCalled();
});

test('retains the recovery snapshot when previous files cannot be restored', async () => {
  const { command, dockerService, filesystem } = createCommand({ wasRunningBeforeUpdate: true });
  dockerService.composeApp.mockRejectedValueOnce(new Error('registry unavailable'));
  filesystem.copyDirectory.mockImplementation(
    async (source, destination) => source !== '/tmp/runtipi-update-abc/previous-app' || destination !== '/data/apps/test',
  );

  const result = await command.execute(appUrn, {});

  expect(result).toEqual({
    success: false,
    message:
      'registry unavailable. Recovery failed; the previous app files are retained at /tmp/runtipi-update-abc. After recovering the app, remove this directory manually.',
    rollbackSucceeded: false,
    recoverySnapshotPath: '/tmp/runtipi-update-abc',
  });
  expect(filesystem.removeDirectory).not.toHaveBeenCalled();
});

test('retains the recovery snapshot when the current app folder cannot be removed for rollback', async () => {
  const { command, dockerService, appFilesManager, filesystem } = createCommand();
  dockerService.composeApp.mockRejectedValueOnce(new Error('registry unavailable'));
  appFilesManager.deleteAppFolder.mockResolvedValue(false);

  const result = await command.execute(appUrn, {});

  expect(result).toEqual({
    success: false,
    message:
      'registry unavailable. Recovery failed; the previous app files are retained at /tmp/runtipi-update-abc. After recovering the app, remove this directory manually.',
    rollbackSucceeded: false,
    recoverySnapshotPath: '/tmp/runtipi-update-abc',
  });
  expect(filesystem.copyDirectory).not.toHaveBeenCalledWith('/tmp/runtipi-update-abc/previous-app', '/data/apps/test');
  expect(filesystem.removeDirectory).not.toHaveBeenCalled();
});
