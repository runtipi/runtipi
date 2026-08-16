import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppHelpers } from '@/modules/apps/app.helpers';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import type { ModuleRef } from '@nestjs/core';
import type { AppUrn } from '@runtipi/common/types';
import type Dockerode from 'dockerode';
import { AppLifecycleCommand } from './command';
import { dynamicComposeSchemaYaml } from '@runtipi/common/schemas';
import { type } from 'arktype';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import path from 'node:path';

export class UpdateAppCommand extends AppLifecycleCommand {
  constructor(
    moduleRef: ModuleRef,
    docker: Dockerode,
    private readonly performBackup: boolean = true,
    private readonly wasRunningBeforeUpdate: boolean = false,
  ) {
    super(moduleRef, docker);
  }

  public async execute(appUrn: AppUrn, form: AppEventFormInput) {
    const logger = this.moduleRef.get(LoggerService, { strict: false });
    const appFilesManager = this.moduleRef.get(AppFilesManager, { strict: false });
    const dockerService = this.moduleRef.get(DockerService, { strict: false });
    const marketplaceService = this.moduleRef.get(MarketplaceService, { strict: false });
    const appHelpers = this.moduleRef.get(AppHelpers, { strict: false });
    const backupManager = this.moduleRef.get(BackupManager, { strict: false });
    const appsRepository = this.moduleRef.get(AppsRepository, { strict: false });
    const config = this.moduleRef.get(ConfigurationService, { strict: false });
    const filesystem = this.moduleRef.get(FilesystemService, { strict: false });

    let temporaryDirectory: string | null = null;
    let appInstalledDir: string | null = null;
    let previousAppDirectory: string | null = null;
    let previousEnvPath: string | null = null;
    let previousEnvSnapshotPath: string | null = null;
    let previousFilesStaged = false;
    let subnetBeforeUpdate: { id: number; subnet: string | null } | null = null;
    let deploymentMayHaveChanged = false;
    let deploymentMayHaveStopped = false;
    let recoverySucceeded = true;

    const restorePreviousApp = async () => {
      if (!previousAppDirectory || !appInstalledDir || !previousEnvPath || !previousEnvSnapshotPath) {
        throw new Error(`Recovery snapshot is incomplete for app ${appUrn}`);
      }

      if (!(await filesystem.copyDirectory(previousAppDirectory, appInstalledDir))) {
        throw new Error(`Failed to restore the previous files for app ${appUrn}`);
      }

      const envSnapshot = await filesystem.readTextFile(previousEnvSnapshotPath);
      if (envSnapshot === null) {
        throw new Error(`Failed to read the previous environment snapshot for app ${appUrn}`);
      }

      let previousEnv: unknown;
      try {
        previousEnv = JSON.parse(envSnapshot);
      } catch {
        throw new Error(`Failed to parse the previous environment snapshot for app ${appUrn}`);
      }

      if (
        typeof previousEnv !== 'object' ||
        previousEnv === null ||
        !('content' in previousEnv) ||
        (typeof previousEnv.content !== 'string' && previousEnv.content !== null)
      ) {
        throw new Error(`Invalid previous environment snapshot for app ${appUrn}`);
      }

      if (previousEnv.content !== null) {
        if (!(await appFilesManager.writeAppEnv(appUrn, previousEnv.content))) {
          throw new Error(`Failed to restore the previous environment for app ${appUrn}`);
        }
      } else if ((await filesystem.isFile(previousEnvPath)) && !(await filesystem.removeFile(previousEnvPath))) {
        throw new Error(`Failed to remove the generated environment for app ${appUrn}`);
      }
    };

    const clearAppFolderForRestore = async () => {
      if (!(await appFilesManager.deleteAppFolder(appUrn))) {
        throw new Error(`Failed to remove the current app files for app ${appUrn}`);
      }
    };

    try {
      const composeToInstall = await marketplaceService.getSourceDockerComposeYaml(appUrn);
      const compose = dynamicComposeSchemaYaml(composeToInstall.content);

      if (compose instanceof type.errors) {
        logger.error('Compose JSON validation errors:', compose.summary);
        return { ...(await this.handleAppError(compose.summary, appUrn, 'update_error')), rollbackSucceeded: true };
      }

      const appBeforeUpdate = await appsRepository.getAppByUrn(appUrn);
      if (appBeforeUpdate) {
        subnetBeforeUpdate = { id: appBeforeUpdate.id, subnet: appBeforeUpdate.subnet };
      }

      appInstalledDir = appFilesManager.getAppPaths(appUrn).appInstalledDir;
      const previousEnv = await appFilesManager.getAppEnv(appUrn);
      previousEnvPath = previousEnv.path;
      temporaryDirectory = await filesystem.createTempDirectory(path.join('/tmp', 'runtipi-update-'));
      if (!temporaryDirectory) {
        throw new Error(`Failed to create an update staging directory for app ${appUrn}`);
      }

      previousAppDirectory = path.join(temporaryDirectory, 'previous-app');
      previousEnvSnapshotPath = path.join(temporaryDirectory, 'previous-app.env.json');

      if (!(await filesystem.copyDirectory(appInstalledDir, previousAppDirectory))) {
        throw new Error(`Failed to stage the current files for app ${appUrn}`);
      }
      previousFilesStaged = true;
      if (!(await filesystem.writePrivateTextFile(previousEnvSnapshotPath, JSON.stringify({ content: previousEnv.content })))) {
        throw new Error(`Failed to stage the previous environment for app ${appUrn}`);
      }

      // Pull from an isolated copy
      deploymentMayHaveChanged = true;
      await marketplaceService.copyAppFromRepoToInstalled(appUrn);
      await this.ensureAppDir(appUrn, form, { pruneContainers: false, persistSubnet: false });
      await appHelpers.generateEnvFile(appUrn, form);
      await dockerService.composeApp(appUrn, 'pull');

      // Restore the old compose before taking a backup
      await clearAppFolderForRestore();
      await restorePreviousApp();

      if (this.performBackup) {
        deploymentMayHaveStopped = true;
        await dockerService.composeApp(appUrn, 'stop');
        await backupManager.backupApp(appUrn);

        const app = await appsRepository.getAppByUrn(appUrn);
        const maxBackups = app?.maxBackups ?? config.get('userSettings').maxBackups;

        await backupManager.cleanupOldBackups(appUrn, maxBackups);
      }

      logger.info(`Updating app ${appUrn}`);
      deploymentMayHaveStopped = true;
      await dockerService.composeApp(appUrn, 'down --remove-orphans');

      await marketplaceService.copyAppFromRepoToInstalled(appUrn);
      await this.ensureAppDir(appUrn, form, { pruneContainers: false });
      await appHelpers.generateEnvFile(appUrn, form);

      if (this.wasRunningBeforeUpdate) {
        await dockerService.composeApp(appUrn, 'up --detach --force-recreate --remove-orphans');
      }

      return { success: true, message: `App ${appUrn} updated successfully` };
    } catch (err) {
      try {
        if (previousFilesStaged && deploymentMayHaveChanged) {
          await clearAppFolderForRestore();
          await restorePreviousApp();
        }

        if (subnetBeforeUpdate) {
          const currentApp = await appsRepository.getAppByUrn(appUrn);
          if (currentApp?.subnet !== subnetBeforeUpdate.subnet) {
            await appsRepository.updateAppById(subnetBeforeUpdate.id, { subnet: subnetBeforeUpdate.subnet });
          }
        }

        if (previousFilesStaged && deploymentMayHaveChanged && deploymentMayHaveStopped && this.wasRunningBeforeUpdate) {
          await this.ensureAppDir(appUrn, form, { pruneContainers: false, persistSubnet: false });
          await dockerService.composeApp(appUrn, 'up --detach --force-recreate --remove-orphans');
        }
      } catch (rollbackError) {
        recoverySucceeded = false;
        logger.error(`Failed to restore app ${appUrn} after an update error. Recovery snapshot retained at ${temporaryDirectory}:`, rollbackError);
      }

      const updateError = await this.handleAppError(err, appUrn, 'update_error');
      if (!recoverySucceeded) {
        return {
          success: false,
          rollbackSucceeded: false,
          recoverySnapshotPath: temporaryDirectory,
          message: `${updateError.message}. Recovery failed; the previous app files are retained at ${temporaryDirectory}.`,
        };
      }

      return { ...updateError, rollbackSucceeded: true };
    } finally {
      if (temporaryDirectory && recoverySucceeded) {
        try {
          const removed = await filesystem.removeDirectory(temporaryDirectory);
          if (!removed) {
            logger.error(`Failed to remove recovery snapshot for app ${appUrn} at ${temporaryDirectory}; it may contain the previous environment.`);
          }
        } catch {
          logger.error(`Failed to remove recovery snapshot for app ${appUrn} at ${temporaryDirectory}; it may contain the previous environment.`);
        }
      }
    }
  }
}
