import path from 'node:path';
import { extractAppUrn } from '@/common/helpers/app-helpers';
import { ArchiveService } from '@/core/archive/archive.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppFilesManager } from '../apps/app-files-manager';

@Injectable()
export class BackupManager {
  constructor(
    private readonly archiveManager: ArchiveService,
    private readonly logger: LoggerService,
    private readonly config: ConfigurationService,
    private readonly filesystem: FilesystemService,
    private readonly appFilesManager: AppFilesManager,
  ) {}

  public backupApp = async (appUrn: AppUrn) => {
    const { dataDir } = this.config.get('directories');
    const backupName = `${appUrn}-${new Date().getTime()}`;
    const { appStoreId, appName } = extractAppUrn(appUrn);

    const backupDir = path.join(dataDir, 'backups', appStoreId, appName);

    const tempDir = await this.filesystem.createTempDirectory(appUrn);

    if (!tempDir) {
      throw new Error('Failed to create temp directory');
    }

    this.logger.info('Copying files to backup location...');

    await this.filesystem.createDirectory(tempDir);

    const { appDataDir, appInstalledDir } = this.appFilesManager.getAppPaths(appUrn);
    const userConfigDir = path.join(dataDir, 'user-config', appStoreId, appName);

    await this.filesystem.copyDirectory(appDataDir, path.join(tempDir, 'app-data'), {
      recursive: true,
      filter: (src) => !src.includes('backups'),
    });

    await this.filesystem.copyDirectory(appInstalledDir, path.join(tempDir, 'app'));

    if (await this.filesystem.pathExists(userConfigDir)) {
      this.logger.info('Including user configuration in backup...');
      await this.filesystem.copyDirectory(userConfigDir, path.join(tempDir, 'user-config'));
    }

    this.logger.info('Creating archive...');

    // Create the archive
    const { stdout, stderr } = await this.archiveManager.createTarGz(tempDir, `${path.join(tempDir, backupName)}.tar.gz`);
    this.logger.debug('--- archiveManager.createTarGz ---');
    this.logger.debug('stderr:', stderr);
    this.logger.debug('stdout:', stdout);

    this.logger.info('Moving archive to backup directory...', backupDir);

    // Move the archive to the backup directory
    await this.filesystem.createDirectory(backupDir);
    await this.filesystem.copyFile(`${path.join(tempDir, backupName)}.tar.gz`, path.join(backupDir, `${backupName}.tar.gz`));

    // Remove the temp backup folder
    await this.filesystem.removeDirectory(tempDir);

    this.logger.info('Backup completed!');
  };

  public restoreApp = async (appUrn: AppUrn, filename: string) => {
    const { dataDir } = this.config.get('directories');
    const restoreDir = await this.filesystem.createTempDirectory(appUrn);

    if (!restoreDir) {
      throw new Error('Failed to create temp directory');
    }

    const { appStoreId, appName } = extractAppUrn(appUrn);
    const archive = path.join(dataDir, 'backups', appStoreId, appName, filename);

    this.logger.info('Restoring app from backup...');

    // Verify the app has a backup
    if (!(await this.filesystem.pathExists(archive))) {
      throw new Error('The backup file does not exist');
    }

    // Unzip the archive
    await this.filesystem.createDirectory(restoreDir);

    this.logger.info('Extracting archive...');
    const { stderr, stdout } = await this.archiveManager.extractTarGz(archive, restoreDir);
    this.logger.debug('--- archiveManager.extractTarGz ---');
    this.logger.debug('stderr:', stderr);
    this.logger.debug('stdout:', stdout);

    const { appInstalledDir, appDataDir } = this.appFilesManager.getAppPaths(appUrn);
    const userConfigDir = path.join(dataDir, 'user-config', appStoreId, appName);

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

    if (await this.filesystem.pathExists(path.join(restoreDir, 'user-config'))) {
      await this.filesystem.copyDirectory(path.join(restoreDir, 'user-config'), userConfigDir);
    }

    // Delete restore folder
    await this.filesystem.removeDirectory(restoreDir);
  };

  /**
   * Delete a backup file
   * @param appUrn - The app id
   * @param filename - The filename of the backup
   */
  public async deleteBackup(appUrn: AppUrn, filename: string) {
    const { dataDir } = this.config.get('directories');

    const { appName, appStoreId } = extractAppUrn(appUrn);

    const backupPath = path.join(dataDir, 'backups', appStoreId, appName, filename);

    if (await this.filesystem.pathExists(backupPath)) {
      await this.filesystem.removeFile(backupPath);
    }
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
    const { dataDir } = this.config.get('directories');

    const { appName, appStoreId } = extractAppUrn(appUrn);
    const backupsDir = path.join(dataDir, 'backups', appStoreId, appName);

    if (!(await this.filesystem.pathExists(backupsDir))) {
      return [];
    }

    try {
      const list = await this.filesystem.listFiles(backupsDir);

      const backups = await Promise.all(
        list.map(async (backup) => {
          const stats = await this.filesystem.getStats(path.join(backupsDir, backup));
          return { id: backup, size: stats.size, date: stats.mtime.getTime() };
        }),
      );

      return backups;
    } catch (error) {
      this.logger.error(`Error listing backups for app ${appUrn}: ${error}`);
      return [];
    }
  }
}
