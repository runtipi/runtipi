import path from 'node:path';
import { ArchiveService } from '@/core/archive/archive.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BackupManager {
  constructor(
    private readonly archiveManager: ArchiveService,
    private readonly logger: LoggerService,
    private readonly config: ConfigurationService,
    private readonly filesystem: FilesystemService,
  ) {}

  public backupApp = async (appId: string) => {
    const { dataDir, appDataDir } = this.config.get('directories');
    const backupName = `${appId}-${new Date().getTime()}`;
    const backupDir = path.join(dataDir, 'backups', appId);

    const tempDir = await this.filesystem.createTempDirectory(appId);

    if (!tempDir) {
      throw new Error('Failed to create temp directory');
    }

    this.logger.info('Copying files to backup location...');

    // Ensure backup directory exists
    await this.filesystem.createDirectory(tempDir);

    // Move app data and app directories
    await this.filesystem.copyDirectory(path.join(appDataDir, appId), path.join(tempDir, 'app-data'), {
      recursive: true,
      filter: (src) => !src.includes('backups'),
    });

    await this.filesystem.copyDirectory(path.join(dataDir, 'apps', appId), path.join(tempDir, 'app'));

    this.logger.info('Creating archive...');

    // Create the archive
    const { stdout, stderr } = await this.archiveManager.createTarGz(tempDir, `${path.join(tempDir, backupName)}.tar.gz`);
    this.logger.debug('--- archiveManager.createTarGz ---');
    this.logger.debug('stderr:', stderr);
    this.logger.debug('stdout:', stdout);

    this.logger.info('Moving archive to backup directory...');

    // Move the archive to the backup directory
    await this.filesystem.createDirectory(backupDir);
    await this.filesystem.copyFile(`${path.join(tempDir, backupName)}.tar.gz`, path.join(backupDir, `${backupName}.tar.gz`));

    // Remove the temp backup folder
    await this.filesystem.removeDirectory(tempDir);

    this.logger.info('Backup completed!');
  };

  public restoreApp = async (appId: string, filename: string) => {
    const { dataDir, appDataDir } = this.config.get('directories');
    const restoreDir = await this.filesystem.createTempDirectory(appId);

    if (!restoreDir) {
      throw new Error('Failed to create temp directory');
    }

    const archive = path.join(dataDir, 'backups', appId, filename);

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

    const appDataDirPath = path.join(appDataDir, appId);
    const appDirPath = path.join(dataDir, 'apps', appId);

    // Remove old data directories
    await this.filesystem.removeDirectory(appDataDirPath);
    await this.filesystem.removeDirectory(appDirPath);

    await this.filesystem.createDirectory(appDataDirPath);
    await this.filesystem.createDirectory(appDirPath);

    // Copy data from the backup folder
    await this.filesystem.copyDirectory(path.join(restoreDir, 'app-data'), appDataDirPath);
    await this.filesystem.copyDirectory(path.join(restoreDir, 'app'), appDirPath);

    // Delete restore folder
    await this.filesystem.removeDirectory(restoreDir);
  };

  /**
   * Delete a backup file
   * @param appId - The app id
   * @param filename - The filename of the backup
   */
  public async deleteBackup(appId: string, filename: string) {
    const { dataDir } = this.config.get('directories');

    const backupPath = path.join(dataDir, 'backups', appId, filename);

    if (await this.filesystem.pathExists(backupPath)) {
      await this.filesystem.removeFile(backupPath);
    }
  }

  /**
   * Delete all backups for an app
   * @param appId - The app id 
   */
  public async deleteAppBackupsById(appId: string): Promise<void> {
    const backups = await this.listBackupsByAppId(appId);

    await Promise.all(backups.map((backup) => this.deleteBackup(appId, backup.id)))
  }

  /**
   * List the backups for an app
   * @param appId - The app id
   * @returns The list of backups
   */
  public async listBackupsByAppId(appId: string) {
    const { dataDir } = this.config.get('directories');

    const backupsDir = path.join(dataDir, 'backups', appId);

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
      this.logger.error(`Error listing backups for app ${appId}: ${error}`);
      return [];
    }
  }
}
