import { castAppUrn } from '@/common/helpers/app-helpers';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { AppsService } from '@/modules/apps/apps.service';
import { StatusManagerService } from '@/modules/app-lifecycle/services/status-manager.service';
import { LoggerService } from '@/core/logger/logger.service';
import { SSEService } from '@/core/sse/sse.service';
import { fromPartial } from '@total-typescript/shoehorn';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { UserConfigService } from '../user-config.service';

const urn = castAppUrn('demo:store');
const setup = (enabled = true) => {
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
  const files = mock<AppFilesManager>();
  files.getUserComposeFile.mockResolvedValue({ path: '/compose', content: 'old compose' });
  files.getUserEnv.mockResolvedValue({ path: '/env', content: 'OLD=value' });
  const filesystem = mock<FilesystemService>();
  filesystem.writeTextFile.mockResolvedValue(true);
  return { repository, filesystem, service: new UserConfigService(files, repository, mock<AppsService>(), filesystem) };
};

test.each([true, false])('marks changed enabled=%s overrides pending until a successful restart', async (enabled) => {
  const { service, repository } = setup(enabled);
  await service.updateUserConfig(urn, { dockerCompose: 'new compose', appEnv: 'NEW=value' });
  expect(await repository.getAppByUrn(urn)).toMatchObject({ pendingRestart: enabled });
  const status = new StatusManagerService(repository, mock<SSEService>(), mock<LoggerService>());
  await status.emitSuccess({ appId: 1, appUrn: urn, event: 'restart_success', status: 'running', clearPendingRestart: true });
  expect(await repository.getAppByUrn(urn)).toMatchObject({ pendingRestart: false });
});

test('unchanged overrides do not create a pending restart or write files', async () => {
  const { service, repository, filesystem } = setup();
  await service.updateUserConfig(urn, { dockerCompose: 'old compose', appEnv: 'OLD=value' });
  expect(await repository.getAppByUrn(urn)).toMatchObject({ pendingRestart: false });
  expect(filesystem.writeTextFile).not.toHaveBeenCalled();
});

test('failed override writes reject instead of reporting success', async () => {
  const { service, repository, filesystem } = setup();
  filesystem.writeTextFile.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  await expect(service.updateUserConfig(urn, { dockerCompose: 'new compose', appEnv: 'NEW=value' })).rejects.toThrow('environment override');
  expect(await repository.getAppByUrn(urn)).toMatchObject({ pendingRestart: true });
});

test('missing apps cannot receive overrides', async () => {
  const { service, repository, filesystem } = setup();
  repository.getAppByUrn.mockResolvedValue(undefined);
  await expect(service.updateUserConfig(urn, { dockerCompose: '', appEnv: '' })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  expect(filesystem.writeTextFile).not.toHaveBeenCalled();
});
