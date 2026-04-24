import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppHelpers } from '@/modules/apps/app.helpers';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import { convertLegacyToYaml } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';
import type { ModuleRef } from '@nestjs/core';
import type Dockerode from 'dockerode';
import { test, expect, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { UpdateAppCommand } from './update-app-command';

test('applies backup retention after an update backup using the global limit when the app has no override', async () => {
  const appUrn = 'app:test' as AppUrn;
  const logger = mock<LoggerService>();
  const appFilesManager = mock<AppFilesManager>();
  const dockerService = mock<DockerService>();
  const marketplaceService = mock<MarketplaceService>();
  const appHelpers = mock<AppHelpers>();
  const backupManager = mock<BackupManager>();
  const appsRepository = mock<AppsRepository>();
  const config = mock<ConfigurationService>();
  const docker = mock<Dockerode>();

  dockerService.composeApp.mockResolvedValue({ success: true, stdout: '', stderr: '' });
  marketplaceService.getSourceDockerComposeYaml.mockResolvedValue({
    path: '/app/apps/test/docker-compose.yml',
    content: convertLegacyToYaml({
      schemaVersion: 2,
      services: [{ name: 'app', image: 'nginx:latest', isMain: true, internalPort: 80 }],
    }),
  });
  appHelpers.generateEnvFile.mockResolvedValue(undefined);
  appFilesManager.deleteAppFolder.mockResolvedValue(undefined);
  marketplaceService.copyAppFromRepoToInstalled.mockResolvedValue(undefined);
  backupManager.backupApp.mockResolvedValue(undefined);
  backupManager.cleanupOldBackups.mockResolvedValue(undefined);
  appsRepository.getAppByUrn.mockResolvedValue({ maxBackups: null } as Awaited<ReturnType<AppsRepository['getAppByUrn']>>);
  config.get.calledWith('userSettings').mockReturnValue({ maxBackups: 7 } as never);

  const services = new Map<unknown, unknown>([
    [LoggerService, logger],
    [AppFilesManager, appFilesManager],
    [DockerService, dockerService],
    [MarketplaceService, marketplaceService],
    [AppHelpers, appHelpers],
    [BackupManager, backupManager],
    [AppsRepository, appsRepository],
    [ConfigurationService, config],
  ]);

  const moduleRef = {
    get: (token: unknown) => services.get(token),
  } as ModuleRef;

  const command = new UpdateAppCommand(moduleRef, docker, true);
  vi.spyOn(
    command as UpdateAppCommand & { ensureAppDir: (appUrn: AppUrn, form: Record<string, unknown>) => Promise<void> },
    'ensureAppDir',
  ).mockResolvedValue();

  const result = await command.execute(appUrn, {});

  expect(result).toEqual({ success: true, message: `App ${appUrn} updated successfully` });
  expect(backupManager.cleanupOldBackups).toHaveBeenCalledWith(appUrn, 7);
});
