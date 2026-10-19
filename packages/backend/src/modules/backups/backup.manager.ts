import fs from 'node:fs';
import path from 'node:path';
import { extractAppUrn } from '@/common/helpers/app-helpers';
import { pLimit, sanitizeFilename } from '@/common/helpers/file-helpers';
import { ArchiveService, type ArchiveEntry } from '@/core/archive/archive.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppFilesManager } from '../apps/app-files-manager';
import { AppsRepository } from '../apps/apps.repository';
import { DockerService } from '../docker/docker.service';
import type { AppJobContext } from '../app-lifecycle/services/app-job.service';

export class BackupRecoveryError extends Error {}

@Injectable()
export class BackupManager implements OnModuleInit {
  constructor(
    private readonly archiveManager: ArchiveService,
    private readonly logger: LoggerService,
    private readonly config: ConfigurationService,
    private readonly filesystem: FilesystemService,
    private readonly appFilesManager: AppFilesManager,
    private readonly docker: DockerService,
    private readonly apps: AppsRepository,
  ) {}

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

  public async backupApp(appUrn: AppUrn, wasRunning: boolean, context?: AppJobContext) {
    context?.signal.throwIfAborted();

    const { appName, appStoreId, backupDir } = this.getBackupPaths(appUrn);
    const { snapshotRoot, archiveRoot } = this.getStagingPaths();
    const backupName = `${appName}-${appStoreId}-${Date.now()}`;

    await Promise.all([snapshotRoot, archiveRoot, backupDir].map((directory) => fs.promises.mkdir(directory, { recursive: true })));
    const tempDir = await this.filesystem.createTempDirectory(path.join(snapshotRoot, 'snapshot-'));
    if (!tempDir) throw new Error('Failed to create temp directory');

    const partialArchive = this.filesystem.getSafeFilePath(path.join(archiveRoot, `${backupName}.partial`));

    try {
      context?.signal.throwIfAborted();
      let snapshotError: Error | undefined;

      try {
        context?.progress('stopping');
        await this.docker.composeApp(appUrn, 'stop');
        await this.copySnapshot(appUrn, tempDir, context);
      } catch (error) {
        snapshotError = error instanceof Error ? error : new Error(String(error));
      }

      if (wasRunning) {
        try {
          await this.docker.composeApp(appUrn, 'up --detach --remove-orphans');
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const original = snapshotError ? `${snapshotError.message}. ` : '';
          throw new BackupRecoveryError(`${original}Failed to restart the app: ${message}`, { cause: error });
        }
      }

      if (snapshotError) throw snapshotError;

      context?.signal.throwIfAborted();
      context?.progress('archiving');
      await this.archiveManager.createTarGz(tempDir, partialArchive, context?.signal);

      context?.disableCancellation();
      context?.progress('saving');
      await fs.promises.rename(partialArchive, this.filesystem.getSafeFilePath(path.join(backupDir, `${backupName}.tar.gz`)));
      this.logger.info('Backup completed!');

      try {
        const app = await this.apps.getAppByUrn(appUrn);
        const maxBackups = app?.maxBackups ?? this.config.get('userSettings').maxBackups;

        await this.cleanupOldBackups(appUrn, maxBackups);
      } catch (error) {
        this.logger.warn(`Failed to clean old backups for ${appUrn}:`, error);
      }
    } finally {
      await Promise.all([this.cleanupStaging(partialArchive), this.cleanupStaging(tempDir)]);
    }
  }

  private async copySnapshot(appUrn: AppUrn, tempDir: string, context?: AppJobContext) {
    context?.signal.throwIfAborted();
    context?.progress('copying');

    const { appDataDir, appInstalledDir } = this.appFilesManager.getAppPaths(appUrn);
    const { userConfigDir } = this.getBackupPaths(appUrn);
    const copyOptions = {
      preserveTimestamps: true,
      verbatimSymlinks: true,
      filter: () => {
        context?.signal.throwIfAborted();
        return true;
      },
    };

    const copiedData = await this.filesystem.copyDirectory(appDataDir, path.join(tempDir, 'app-data'), {
      ...copyOptions,
      filter: (source) => copyOptions.filter() && path.basename(source) !== 'backups',
    });
    if (!copiedData) throw new Error('Failed to copy the app data for backup');

    if (!(await this.filesystem.copyDirectory(appInstalledDir, path.join(tempDir, 'app'), copyOptions))) {
      throw new Error('Failed to copy the installed app files for backup');
    }

    if (await this.filesystem.isDirectory(userConfigDir)) {
      if (!(await this.filesystem.copyDirectory(userConfigDir, path.join(tempDir, 'user-config'), copyOptions))) {
        throw new Error('Failed to copy the user configuration for backup');
      }
    }
  }

  public restoreApp = async (appUrn: AppUrn, filename: string) => {
    const restoreDir = await this.filesystem.createTempDirectory(appUrn);

    if (!restoreDir) {
      throw new Error('Failed to create temp directory');
    }

    const { backupDir, backupPath: archive } = this.getBackupFilePath(appUrn, filename);
    const { userConfigDir } = this.getBackupPaths(appUrn);

    if (!archive.startsWith(backupDir)) {
      throw new Error('Invalid backup file path');
    }

    this.logger.info('Restoring app from backup...');

    // Verify the app has a backup
    if (!(await this.filesystem.isFile(archive))) {
      throw new Error('The backup file does not exist');
    }

    // Unzip the archive
    await this.filesystem.createDirectory(restoreDir);

    try {
      this.validateRestoreArchiveEntries(await this.archiveManager.listTarGz(archive));

      this.logger.info('Extracting archive...');
      const { stderr, stdout } = await this.archiveManager.extractTarGz(archive, restoreDir);
      this.logger.debug('--- archiveManager.extractTarGz ---');
      this.logger.debug('stderr:', stderr);
      this.logger.debug('stdout:', stdout);

      const runValidationFsOperation = pLimit(16);

      await this.validateRestoreDirectory(path.join(restoreDir, 'app-data'), { allowSymlinks: true }, undefined, runValidationFsOperation);
      await this.validateRestoreDirectory(
        path.join(restoreDir, 'app'),
        { allowSymlinks: true, rejectHardLinks: true },
        undefined,
        runValidationFsOperation,
      );
      await this.validateRestoreDirectory(
        path.join(restoreDir, 'user-config'),
        {
          allowSymlinks: false,
          optional: true,
          rejectHardLinks: true,
        },
        undefined,
        runValidationFsOperation,
      );

      const { appInstalledDir, appDataDir } = this.appFilesManager.getAppPaths(appUrn);

      // Remove old data directories
      await this.filesystem.removeDirectory(appDataDir);
      await this.filesystem.removeDirectory(appInstalledDir);
      await this.filesystem.removeDirectory(userConfigDir);

      await this.filesystem.createDirectory(appDataDir);
      await this.filesystem.createDirectory(appInstalledDir);
      await this.filesystem.createDirectory(userConfigDir);

      // Copy data from the backup folder
      await this.filesystem.copyDirectory(path.join(restoreDir, 'app-data'), appDataDir);
      await this.filesystem.copyDirectory(path.join(restoreDir, 'app'), appInstalledDir);

      if (await this.filesystem.isDirectory(path.join(restoreDir, 'user-config'))) {
        await this.filesystem.copyDirectory(path.join(restoreDir, 'user-config'), userConfigDir);
      }
    } finally {
      await this.filesystem.removeDirectory(restoreDir);
    }
  };

  private validateRestoreArchiveEntries(entries: ArchiveEntry[]) {
    for (const entry of entries) {
      if (entry.type !== '-' && entry.type !== 'd') {
        throw new Error('Backup contains unsupported file types');
      }

      const entryPath = this.normalizeArchiveEntryPath(entry.path);

      if (entryPath === '.') {
        continue;
      }

      const rootName = entryPath.split('/')[0];

      if (!rootName) {
        throw new Error('Backup contains unsupported file types');
      }
    }
  }

  private normalizeArchiveEntryPath(entryPath: string) {
    if (path.posix.isAbsolute(entryPath)) {
      throw new Error('Backup contains unsupported file types');
    }

    const normalizedPath = path.posix.normalize(entryPath.replace(/^(\.\/)+/, ''));

    if (normalizedPath === '..' || normalizedPath.startsWith('../')) {
      throw new Error('Backup contains unsupported file types');
    }

    return normalizedPath;
  }

  private async validateRestoreDirectory(
    directory: string,
    options: { allowSymlinks: boolean; optional?: boolean; rejectHardLinks?: boolean },
    rootDirectory = directory,
    runFsOperation = pLimit(16),
  ) {
    const directoryStats = await runFsOperation(() => fs.promises.lstat(directory)).catch((error: NodeJS.ErrnoException) => {
      if (options.optional && error.code === 'ENOENT') {
        return null;
      }

      throw error;
    });

    if (!directoryStats) {
      return;
    }

    if (!directoryStats.isDirectory()) {
      throw new Error('Backup contains unsupported file types');
    }

    const entries = await runFsOperation(() => fs.promises.readdir(directory, { withFileTypes: true }));
    const rootPath = path.resolve(rootDirectory);
    let nextEntryIndex = 0;

    const workers = Array.from({ length: Math.min(16, entries.length) }, async () => {
      while (nextEntryIndex < entries.length) {
        const entry = entries[nextEntryIndex];
        nextEntryIndex += 1;

        if (!entry) {
          continue;
        }

        const entryPath = path.join(directory, entry.name);

        if (entry.isSymbolicLink()) {
          if (!options.allowSymlinks) {
            throw new Error('Backup contains unsupported file types');
          }

          const linkTarget = await runFsOperation(() => fs.promises.readlink(entryPath));
          const resolvedTarget = path.resolve(path.dirname(entryPath), linkTarget);

          if (!this.isPathInsideOrEqual(rootPath, resolvedTarget)) {
            throw new Error('Backup contains unsupported file types');
          }

          continue;
        }

        if (entry.isDirectory()) {
          await this.validateRestoreDirectory(entryPath, options, rootDirectory, runFsOperation);
          continue;
        }

        if (entry.isFile()) {
          if (options.rejectHardLinks) {
            const stats = await runFsOperation(() => fs.promises.lstat(entryPath));

            if (stats.nlink > 1) {
              throw new Error('Backup contains unsupported file types');
            }
          }

          continue;
        }

        throw new Error('Backup contains unsupported file types');
      }
    });

    await Promise.all(workers);
  }

  private isPathInsideOrEqual(parentPath: string, childPath: string): boolean {
    const relativePath = path.relative(parentPath, childPath);

    return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
  }

  /**
   * Delete a backup file
   * @param appUrn - The app id
   * @param filename - The filename of the backup
   */
  public async deleteBackup(appUrn: AppUrn, filename: string) {
    const { backupPath } = this.getBackupFilePath(appUrn, filename);

    if (await this.filesystem.pathExists(backupPath)) {
      await this.filesystem.removeFile(backupPath);
    }
  }

  /**
   * Clean up old backups based on retention policy
   * @param appUrn - The app id
   * @param maxBackups - Maximum number of backups to keep (0 means no limit)
   */
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

  /**
   * Delete all backups for an app
   * @param appUrn - The app id
   */
  public async deleteAppBackupsByUrn(appUrn: AppUrn): Promise<void> {
    const backups = await this.listBackupsByAppId(appUrn);

    await Promise.all(backups.map((backup) => this.deleteBackup(appUrn, backup.id)));
  }

  /**
   * List the backups for an app
   * @param appUrn - The app id
   * @returns The list of backups
   */
  public async listBackupsByAppId(appUrn: AppUrn) {
    const { backupDir: backupsDir } = this.getBackupPaths(appUrn);

    if (!(await this.filesystem.isDirectory(backupsDir))) {
      return [];
    }

    try {
      const list = await this.filesystem.listFiles(backupsDir);

      const backups = await Promise.all(
        list
          .filter((backup) => backup.endsWith('.tar.gz') && !backup.startsWith('.'))
          .map(async (backup) => {
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

  /**
   * Get the file path for a backup
   * @param appUrn - The app id
   * @param filename - The filename of the backup
   * @returns The backup file path
   */
  public async getBackupPath(appUrn: AppUrn, filename: string): Promise<string> {
    const { backupPath } = this.getBackupFilePath(appUrn, filename);

    if (!(await this.filesystem.isFile(backupPath))) {
      throw new Error('The backup file does not exist');
    }

    return backupPath;
  }

  /**
   * Upload a backup file
   * @param appUrn - The app id
   * @param filename - The filename of the backup
   * @param fileBuffer - The file buffer
   */
  public async uploadBackup(appUrn: AppUrn, filename: string, fileBuffer: Buffer): Promise<void> {
    const { backupDir, backupPath, sanitizedFilename } = this.getBackupFilePath(appUrn, filename);

    // Create backup directory if it doesn't exist
    await this.filesystem.createDirectory(backupDir);

    // Check if file already exists
    if (await this.filesystem.pathExists(backupPath)) {
      throw new Error('A backup with this filename already exists');
    }

    // Write the file
    await this.filesystem.writeBinaryFile(backupPath, fileBuffer);

    this.logger.info(`Backup uploaded successfully: ${sanitizedFilename}`);
  }
}
