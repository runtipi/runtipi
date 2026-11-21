import { EOL } from 'node:os';
import { DATA_DIR } from '@/common/constants';
import { castAppUrn } from '@/common/helpers/app-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { AppsService } from '@/modules/apps/apps.service';
import { AppJobService } from '@/modules/app-lifecycle/services/app-job.service';
import { AppOperationsService } from '@/modules/app-lifecycle/services/app-operations.service';
import { StatusManagerService } from '@/modules/app-lifecycle/services/status-manager.service';
import { LoggerService } from '@/core/logger/logger.service';
import { SSEService } from '@/core/sse/sse.service';
import { fromPartial } from '@total-typescript/shoehorn';
import { expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { UserConfigService } from '../user-config.service';

const urn = castAppUrn('demo:store');
const setup = async (enabled = true) => {
  const repository = mock<AppsRepository>();
  let app = fromPartial<NonNullable<Awaited<ReturnType<AppsRepository['getAppByUrn']>>>>({
    id: 1,
    userConfigEnabled: enabled,
    pendingRestart: false,
  });
  repository.getAppByUrn.mockImplementation(async () => app);
  repository.updateAppById.mockImplementation(async (_id, update) => {
    app = { ...app, ...update };
    return app;
  });

  const logger = mock<LoggerService>();
  const config = mock<ConfigurationService>();
  config.getConfig.mockReturnValue(fromPartial({ directories: { dataDir: DATA_DIR } }));
  const filesystem = new FilesystemService(logger);
  const files = new AppFilesManager(config, filesystem, logger);
  const composeFile = await files.getUserComposeFile(urn);
  const envFile = await files.getUserEnv(urn);
  await filesystem.writeTextFile(composeFile.path, 'old compose');
  await filesystem.writeTextFile(envFile.path, 'OLD=value');

  const operations = new AppOperationsService(new AppJobService(logger, mock<SSEService>()), logger);
  const service = new UserConfigService(files, repository, mock<AppsService>(), filesystem, operations);

  return { repository, filesystem, files, operations, service };
};

test.each([true, false])('marks changed enabled=%s overrides pending until a successful restart', async (enabled) => {
  const { service, repository } = await setup(enabled);
  await service.updateUserConfig(urn, { dockerCompose: 'new compose', appEnv: 'NEW=value' });
  expect(await repository.getAppByUrn(urn)).toMatchObject({ pendingRestart: enabled });
  const status = new StatusManagerService(repository, mock<SSEService>(), mock<LoggerService>());
  await status.emitSuccess({ appId: 1, appUrn: urn, event: 'restart_success', status: 'running', clearPendingRestart: true });
  expect(await repository.getAppByUrn(urn)).toMatchObject({ pendingRestart: false });
});

test('unchanged overrides do not create a pending restart or write files', async () => {
  const { service, repository, filesystem } = await setup();
  const write = vi.spyOn(filesystem, 'writeTextFile');
  await service.updateUserConfig(urn, { dockerCompose: 'old compose', appEnv: 'OLD=value' });
  expect(await repository.getAppByUrn(urn)).toMatchObject({ pendingRestart: false });
  expect(write).not.toHaveBeenCalled();
});

test.each(['', EOL])('saving identical overrides after restart is idempotent with trailing newline %j', async (newline) => {
  const { service, repository, files, filesystem } = await setup();
  const input = { dockerCompose: `new compose${newline}`, appEnv: `NEW=value${newline}` };
  await service.updateUserConfig(urn, input);
  const compose = await files.getUserComposeFile(urn);
  const env = await files.getUserEnv(urn);
  expect(compose.content).toBe(`new compose${EOL}`);
  expect(env.content).toBe(`NEW=value${EOL}`);

  const status = new StatusManagerService(repository, mock<SSEService>(), mock<LoggerService>());
  await status.emitSuccess({ appId: 1, appUrn: urn, event: 'restart_success', status: 'running', clearPendingRestart: true });
  const write = vi.spyOn(filesystem, 'writeTextFile');
  await service.updateUserConfig(urn, input);
  await service.updateUserConfig(urn, { dockerCompose: compose.content ?? '', appEnv: env.content ?? '' });

  expect(await repository.getAppByUrn(urn)).toMatchObject({ pendingRestart: false });
  expect(write).not.toHaveBeenCalled();
});

test('failed override writes reject and release admission while retaining pending restart', async () => {
  const { service, repository, filesystem, files, operations } = await setup();
  const write = filesystem.writeTextFile.bind(filesystem);
  vi.spyOn(filesystem, 'writeTextFile').mockImplementation((path, content) => {
    if (path.endsWith('app.env')) return Promise.resolve(false);
    return write(path, content);
  });
  await expect(service.updateUserConfig(urn, { dockerCompose: 'new compose', appEnv: 'NEW=value' })).rejects.toThrow('environment override');
  expect(await repository.getAppByUrn(urn)).toMatchObject({ pendingRestart: true });
  expect((await files.getUserComposeFile(urn)).content).toBe(`new compose${EOL}`);
  await expect(operations.admit(urn, async () => undefined)).resolves.toBeUndefined();
});

test('missing apps cannot receive overrides', async () => {
  const { service, repository, filesystem } = await setup();
  repository.getAppByUrn.mockResolvedValue(undefined);
  const write = vi.spyOn(filesystem, 'writeTextFile');
  await expect(service.updateUserConfig(urn, { dockerCompose: '', appEnv: '' })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  expect(write).not.toHaveBeenCalled();
});

test('restart cannot be admitted while override files are being written', async () => {
  const { service, filesystem, operations, repository } = await setup();
  const started = Promise.withResolvers<void>();
  const gate = Promise.withResolvers<void>();
  const write = filesystem.writeTextFile.bind(filesystem);
  vi.spyOn(filesystem, 'writeTextFile').mockImplementation(async (path, content) => {
    started.resolve();
    await gate.promise;
    return write(path, content);
  });
  const update = service.updateUserConfig(urn, { dockerCompose: 'new compose', appEnv: 'NEW=value' });
  try {
    await started.promise;
    await expect(operations.admit(urn, async () => undefined)).rejects.toThrow('active lifecycle operation');
    await expect(operations.admit(castAppUrn('other:store'), async () => undefined)).resolves.toBeUndefined();
  } finally {
    gate.resolve();
    await update;
  }

  expect(await repository.getAppByUrn(urn)).toMatchObject({ pendingRestart: true });
  await expect(operations.admit(urn, async () => undefined)).resolves.toBeUndefined();
});

test('override edits are rejected during restart and mark a new restart pending when retried', async () => {
  const { service, files, operations, repository } = await setup();
  const gate = Promise.withResolvers<void>();
  const status = new StatusManagerService(repository, mock<SSEService>(), mock<LoggerService>());
  const request = await operations.admit(urn, async () =>
    operations.submit(urn, 'restart', 'restart-request', async () => {
      await gate.promise;
      await status.emitSuccess({ appId: 1, appUrn: urn, event: 'restart_success', status: 'running', clearPendingRestart: true });
      return { success: true, message: 'Restarted' };
    }),
  );
  try {
    await expect(service.updateUserConfig(urn, { dockerCompose: 'new compose', appEnv: 'NEW=value' })).rejects.toThrow('active lifecycle operation');
    expect((await files.getUserEnv(urn)).content).toBe(`OLD=value${EOL}`);
  } finally {
    gate.resolve();
    await operations.waitFor(request.requestId);
  }

  await service.updateUserConfig(urn, { dockerCompose: 'new compose', appEnv: 'NEW=value' });
  expect(await repository.getAppByUrn(urn)).toMatchObject({ pendingRestart: true });
  expect((await files.getUserEnv(urn)).content).toBe(`NEW=value${EOL}`);
});
