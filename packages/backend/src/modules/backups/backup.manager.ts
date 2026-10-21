import fs from 'node:fs';
import path from 'node:path';
import { extractAppUrn } from '@/common/helpers/app-helpers';
import { pLimit, sanitizeFilename } from '@/common/helpers/file-helpers';
import { ArchiveService } from '@/core/archive/archive.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { Effect } from 'effect';
import { AppFilesManager } from '../apps/app-files-manager';
import { AppsRepository } from '../apps/apps.repository';
import { BackupArchive, migrationMetadataFilename } from './backup-archive';
import { BackupResources, backupStep, requireFilesystemSuccess, runBackupEffect } from './backup-resources';
import { RestoreTransaction } from './restore-transaction';
import { DockerService } from '../docker/docker.service';
import type { AppJobContext } from '../app-lifecycle/services/app-job.service';

export class BackupRecoveryError extends Error {}

export type MigrationBackupState = {
  version: 1;
  initialized: boolean;
  migrationIds: string[];
};

@Injectable()
export class BackupManager implements OnModuleInit {
  private readonly archiveFiles: BackupArchive;
  private readonly resources: BackupResources;

  constructor(
    private readonly archiveManager: ArchiveService,
    private readonly logger: LoggerService,
    private readonly config: ConfigurationService,
    private readonly filesystem: FilesystemService,
    private readonly appFilesManager: AppFilesManager,
    private readonly appsRepository: AppsRepository,
    private readonly docker: DockerService,
  ) {
    this.archiveFiles = new BackupArchive(filesystem, logger);
    this.resources = new BackupResources(filesystem, logger);
  }

  private getBackupPaths(appUrn: AppUrn) {
    const { dataDir } = this.config.get('directories');
    const { appStoreId, appName } = extractAppUrn(appUrn);

    return {
      appName,
      appStoreId,
      backupDir: path.join(dataDir, 'backups', appStoreId, appName),
      userConfigDir: path.join(dataDir, 'user-config', appStoreId, appName),
    };
  }

  private getValidatedBackupFilename(filename: string) {
    const sanitizedFilename = sanitizeFilename(filename);

    if (sanitizedFilename !== filename || !sanitizedFilename.endsWith('.tar.gz')) {
      throw new Error('Invalid backup filename');
    }

    return sanitizedFilename;
  }

  private getBackupFilePath(appUrn: AppUrn, filename: string) {
    const { backupDir } = this.getBackupPaths(appUrn);
    const sanitizedFilename = this.getValidatedBackupFilename(filename);

    return {
      backupDir,
      sanitizedFilename,
      backupPath: this.filesystem.getSafeFilePath(path.join(backupDir, sanitizedFilename)),
    };
  }

  private getStagingPaths() {
    const { dataDir } = this.config.get('directories');

    return {
      snapshotRoot: '/tmp/runtipi-backup-staging',
      archiveRoot: path.join(dataDir, 'backups', '.staging'),
    };
  }

  async onModuleInit() {
    const { snapshotRoot, archiveRoot } = this.getStagingPaths();
    await this.cleanupStaging(snapshotRoot);

    if (await this.filesystem.isDirectory(path.dirname(archiveRoot))) {
      await this.cleanupStaging(archiveRoot);
    }
  }

  private async cleanupStaging(stagingPath: string) {
    try {
      if ((await fs.promises.lstat(stagingPath)).isSymbolicLink()) {
        await fs.promises.unlink(stagingPath);
        return;
      }

      await fs.promises.rm(stagingPath, { recursive: true, force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      this.logger.warn(`Failed to clean backup staging path ${stagingPath}:`, error);
    }
  }

  public async backupApp(appUrn: AppUrn, wasRunning = false, context?: AppJobContext) {
    const filename = await this.createBackup(appUrn, wasRunning, context);

    try {
      const app = await this.appsRepository.getAppByUrn(appUrn);
      const maxBackups = app?.maxBackups ?? this.config.get('userSettings').maxBackups;
      await this.cleanupOldBackups(appUrn, maxBackups);
    } catch (error) {
      this.logger.warn(`Failed to clean old backups for ${appUrn}:`, error);
    }

    return filename;
  }

  public async createBackup(appUrn: AppUrn, wasRunning = false, context?: AppJobContext) {
    context?.signal.throwIfAborted();
    await this.reconcileRestore(appUrn);

    const { appName, appStoreId, backupDir, userConfigDir } = this.getBackupPaths(appUrn);
    const { snapshotRoot, archiveRoot } = this.getStagingPaths();
    const backupFilename = `${appName}-${appStoreId}-${Date.now()}.tar.gz`;
    const manager = this;

    await Promise.all([snapshotRoot, archiveRoot].map((directory) => fs.promises.mkdir(directory, { recursive: true })));

    return runBackupEffect(
      Effect.scoped(
        Effect.gen(function* () {
          const temporaryDirectory = yield* manager.resources.temporaryDirectory(path.join(snapshotRoot, 'snapshot-'));
          const contentDirectory = path.join(temporaryDirectory, 'content');
          const archivePath = path.join(temporaryDirectory, backupFilename);

          yield* backupStep(async () => {
            await requireFilesystemSuccess(manager.filesystem.createDirectory(contentDirectory), 'Failed to create temporary backup directory');

            context?.signal.throwIfAborted();
            let snapshotError: unknown;

            try {
              context?.progress('stopping');
              await manager.docker.composeApp(appUrn, 'stop');
              context?.progress('copying');
              const { appDataDir, appInstalledDir } = manager.appFilesManager.getAppPaths(appUrn);
              const copyFilter = () => {
                context?.signal.throwIfAborted();
                return true;
              };

              await manager.archiveFiles.stageBackupDirectory(
                appDataDir,
                path.join(contentDirectory, 'app-data'),
                'app data',
                (source) => copyFilter() && path.basename(source) !== 'backups',
              );

              await manager.archiveFiles.stageBackupDirectory(appInstalledDir, path.join(contentDirectory, 'app'), 'app files', copyFilter);
              if (await manager.filesystem.isDirectory(userConfigDir)) {
                await manager.archiveFiles.stageBackupDirectory(
                  userConfigDir,
                  path.join(contentDirectory, 'user-config'),
                  'user configuration',
                  copyFilter,
                );
              }

              const state = await manager.appsRepository.getMigrationState(appUrn);
              await requireFilesystemSuccess(
                manager.filesystem.writeJsonFile(path.join(contentDirectory, migrationMetadataFilename), { version: 1, ...state }),
                'Failed to write backup migration metadata',
              );
            } catch (error) {
              snapshotError = error;
            }

            if (wasRunning) {
              try {
                await manager.docker.composeApp(appUrn, 'up --detach --remove-orphans');
              } catch (error) {
                const original = snapshotError instanceof Error ? `${snapshotError.message}. ` : '';
                const message = error instanceof Error ? error.message : String(error);
                throw new BackupRecoveryError(`${original}Failed to restart the app: ${message}`, { cause: error });
              }
            }

            if (snapshotError) throw snapshotError;
            context?.signal.throwIfAborted();

            for (const name of ['app-data', 'app', 'user-config']) {
              await manager.archiveFiles.validateRestoreDirectory(path.join(contentDirectory, name), {
                allowSymlinks: false,
                rejectHardLinks: true,
                optional: name === 'user-config',
              });
            }

            context?.progress('archiving');
            await manager.archiveManager.createTarGz(contentDirectory, archivePath, context?.signal);
            manager.archiveFiles.validateRestoreArchiveEntries(await manager.archiveManager.listTarGz(archivePath));
            await requireFilesystemSuccess(manager.filesystem.createDirectory(backupDir), 'Failed to create backup directory');
          });

          const privateDirectory = yield* manager.resources.temporaryDirectory(path.join(archiveRoot, '.runtipi-backup-'));
          const privateArchive = path.join(privateDirectory, backupFilename);
          yield* backupStep(() =>
            requireFilesystemSuccess(manager.filesystem.copyFile(archivePath, privateArchive), 'Failed to copy backup archive'),
          );
          yield* backupStep(async () => {
            context?.disableCancellation();
            context?.progress('saving');
            await manager.publishStagedBackup(privateArchive, path.join(backupDir, backupFilename));
          });

          manager.logger.info('Backup completed!');
          return backupFilename;
        }),
      ),
    );
  }

  private async publishStagedBackup(privateBackupPath: string, backupPath: string) {
    try {
      await fs.promises.link(privateBackupPath, backupPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new Error('A backup with this filename already exists');
      }
      throw error;
    }
  }

  public async restoreApp(appUrn: AppUrn, filename: string): Promise<MigrationBackupState | null> {
    await this.reconcileRestore(appUrn);
    const manager = this;

    return runBackupEffect(
      Effect.scoped(
        Effect.gen(function* () {
          const restoreParentDir = yield* manager.resources.temporaryDirectory('/tmp/runtipi-restore-');
          const restoreDir = path.join(restoreParentDir, 'extracted');

          return yield* backupStep(async () => {
            let migrationState: MigrationBackupState | null = null;

            const { backupPath: archive } = manager.getBackupFilePath(appUrn, filename);
            const { userConfigDir } = manager.getBackupPaths(appUrn);

            manager.logger.info('Restoring app from backup...');

            const restoreDirectoryCreated = await manager.filesystem.createDirectory(restoreDir);

            if (!restoreDirectoryCreated) {
              throw new Error('Failed to create temporary restore directory');
            }

            const restoreArchive = path.join(restoreParentDir, '.runtipi-restore-archive.tar.gz');
            await manager.archiveFiles.copyRestoreArchive(archive, restoreArchive);

            manager.archiveFiles.validateRestoreArchiveEntries(await manager.archiveManager.listTarGz(restoreArchive));

            manager.logger.info('Extracting archive...');
            const { stderr, stdout } = await manager.archiveManager.extractTarGz(restoreArchive, restoreDir);
            manager.logger.debug('--- archiveManager.extractTarGz ---');
            manager.logger.debug('stderr:', stderr);
            manager.logger.debug('stdout:', stdout);

            const runValidationFsOperation = pLimit(16);

            await manager.archiveFiles.validateRestoreDirectory(
              path.join(restoreDir, 'app-data'),
              { allowSymlinks: true },
              undefined,
              runValidationFsOperation,
            );

            await manager.archiveFiles.validateRestoreDirectory(
              path.join(restoreDir, 'app'),
              { allowSymlinks: true, rejectHardLinks: true },
              undefined,
              runValidationFsOperation,
            );

            const migrationMetadataPath = path.join(restoreDir, migrationMetadataFilename);
            if (await manager.filesystem.isFile(migrationMetadataPath)) {
              const metadata = await manager.filesystem.readJsonFile(migrationMetadataPath);
              if (!manager.isMigrationBackupState(metadata)) {
                throw new Error('Backup migration metadata is invalid');
              }
              migrationState = metadata;
            }

            await manager.archiveFiles.validateRestoreDirectory(
              path.join(restoreDir, 'user-config'),
              {
                allowSymlinks: false,
                optional: true,
                rejectHardLinks: true,
              },
              undefined,
              runValidationFsOperation,
            );

            const { appInstalledDir, appDataDir } = manager.appFilesManager.getAppPaths(appUrn);
            const restoredUserConfigDir = path.join(restoreDir, 'user-config');
            const userConfigExists = await manager.filesystem.isDirectory(restoredUserConfigDir);
            const userConfigSource = userConfigExists ? restoredUserConfigDir : null;

            const targetState = migrationState ?? { initialized: false, migrationIds: [] };
            await manager.restoreTransaction(appUrn).restore(
              [
                { source: path.join(restoreDir, 'app-data'), destination: appDataDir, error: 'Failed to copy restored app data' },
                { source: path.join(restoreDir, 'app'), destination: appInstalledDir, error: 'Failed to copy restored app files' },
                { source: userConfigSource, destination: userConfigDir, error: 'Failed to copy restored user configuration' },
              ],
              targetState,
            );

            return migrationState;
          });
        }),
      ),
    );
  }

  public async reconcileRestore(appUrn: AppUrn) {
    await this.restoreTransaction(appUrn).reconcile();
  }

  private restoreTransaction(appUrn: AppUrn) {
    const { appDataDir, appInstalledDir } = this.appFilesManager.getAppPaths(appUrn);
    const { userConfigDir } = this.getBackupPaths(appUrn);

    return new RestoreTransaction(appUrn, [appDataDir, appInstalledDir, userConfigDir], this.filesystem, this.appsRepository, this.logger);
  }

  private isMigrationBackupState(value: unknown): value is MigrationBackupState {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const metadata = value as Record<string, unknown>;
    if (!Array.isArray(metadata.migrationIds)) {
      return false;
    }

    const migrationIds = metadata.migrationIds;
    const validMigrationIds = migrationIds.every((migrationId) => typeof migrationId === 'string' && /^[a-z0-9][a-z0-9._-]{0,63}$/.test(migrationId));
    const uniqueMigrationIds = validMigrationIds && new Set(migrationIds).size === migrationIds.length;
    return metadata.version === 1 && typeof metadata.initialized === 'boolean' && uniqueMigrationIds;
  }

  public async deleteBackup(appUrn: AppUrn, filename: string) {
    const { backupPath } = this.getBackupFilePath(appUrn, filename);

    if (await this.filesystem.pathExists(backupPath)) {
      await this.filesystem.removeFile(backupPath);
    }
  }

  public async cleanupOldBackups(appUrn: AppUrn, maxBackups: number) {
    if (!maxBackups) {
      return;
    }

    const backups = await this.listBackupsByAppId(appUrn);

    if (backups.length <= maxBackups) {
      return;
    }

    backups.sort((a, b) => b.date - a.date);

    const backupsToDelete = backups.slice(maxBackups);
    this.logger.info(`Cleaning up ${backupsToDelete.length} old backup(s) for ${appUrn}...`);

    await Promise.all(backupsToDelete.map((backup) => this.deleteBackup(appUrn, backup.id)));
    this.logger.info(`Cleanup completed for ${appUrn}`);
  }

  public async deleteAppBackupsByUrn(appUrn: AppUrn): Promise<void> {
    const backups = await this.listBackupsByAppId(appUrn);

    await Promise.all(backups.map((backup) => this.deleteBackup(appUrn, backup.id)));
  }

  public async listBackupsByAppId(appUrn: AppUrn) {
    const { backupDir: backupsDir } = this.getBackupPaths(appUrn);

    if (!(await this.filesystem.isDirectory(backupsDir))) {
      return [];
    }

    try {
      const list = await this.filesystem.listFiles(backupsDir);

      const backups = await Promise.all(
        list.map(async (backup) => {
          if (sanitizeFilename(backup) !== backup || !backup.endsWith('.tar.gz') || backup.startsWith('.')) {
            return null;
          }

          const backupPath = path.join(backupsDir, backup);

          if (!(await this.filesystem.isFile(backupPath))) {
            return null;
          }

          const stats = await this.filesystem.getStats(backupPath);
          return { id: backup, size: stats.size, date: stats.mtime.getTime() };
        }),
      );

      return backups.filter((backup) => backup !== null);
    } catch (error) {
      this.logger.error(`Error listing backups for app ${appUrn}:`, error);
      return [];
    }
  }

  public async getBackupPath(appUrn: AppUrn, filename: string): Promise<string> {
    const { backupPath } = this.getBackupFilePath(appUrn, filename);

    if (!(await this.filesystem.isFile(backupPath))) {
      throw new Error('The backup file does not exist');
    }

    return backupPath;
  }

  public async uploadBackup(appUrn: AppUrn, filename: string, fileBuffer: Buffer): Promise<void> {
    const { backupDir, backupPath, sanitizedFilename } = this.getBackupFilePath(appUrn, filename);
    await requireFilesystemSuccess(this.filesystem.createDirectory(backupDir), 'Failed to create backup directory');
    const manager = this;

    await runBackupEffect(
      Effect.scoped(
        Effect.gen(function* () {
          const privateDirectory = yield* manager.resources.temporaryDirectory(path.join(backupDir, '.runtipi-backup-'));
          const privateBackupPath = path.join(privateDirectory, sanitizedFilename);

          yield* backupStep(() => fs.promises.writeFile(privateBackupPath, fileBuffer, { flag: 'wx', mode: 0o600 }));
          yield* backupStep(() => manager.publishStagedBackup(privateBackupPath, backupPath));
        }),
      ),
    );

    this.logger.info(`Backup uploaded successfully: ${sanitizedFilename}`);
  }
}
