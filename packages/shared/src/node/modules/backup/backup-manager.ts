import { sanitizePath } from '@runtipi/shared';
import { pathExists, type ILogger } from '@runtipi/shared/node';
import fs from 'node:fs';
import path from 'node:path';
import { ArchiveManager } from '../archive/archive-manager';

export interface IBackupManager {
  backupApp: BackupManager['backupApp'];
  restoreApp: BackupManager['restoreApp'];
  deleteBackup: BackupManager['deleteBackup'];
  listBackupsByAppId: BackupManager['listBackupsByAppId'];
}

export class BackupManager {
  private archiveManager: ArchiveManager;
  private logger: ILogger;
  private dataDir: string;

  constructor(params: { logger: ILogger; dataDir: string }) {
    this.archiveManager = new ArchiveManager();
    this.logger = params.logger;
    this.dataDir = params.dataDir;
  }

  public backupApp = async (appId: string) => {
    const backupName = `${appId}-${new Date().getTime()}`;
    const backupDir = path.join(this.dataDir, 'backups', appId);
    const tempDir = path.join('/tmp', appId);

    // Stop app so containers like databases don't cause problems
    this.logger.info('Copying files to backup location...');

    // Ensure backup directory exists
    await fs.promises.mkdir(tempDir, { recursive: true });

    // Move app data and app directories
    await fs.promises.cp(path.join(this.dataDir, 'apps', appId), path.join(tempDir, 'app-data'), {
      recursive: true,
      filter: (src) => !src.includes('backups'),
    });
    await fs.promises.cp(path.join(this.dataDir, 'apps', appId), path.join(tempDir, 'app'), { recursive: true });

    // Check if the user config folder exists and if it does copy it too
    if (await pathExists(path.join(this.dataDir, 'user-config', appId))) {
      await fs.promises.cp(path.join(this.dataDir, 'user-config', appId), path.join(tempDir, 'user-config'), { recursive: true });
    }

    this.logger.info('Creating archive...');

    // Create the archive
    await this.archiveManager.createTarGz(tempDir, `${path.join(tempDir, backupName)}.tar.gz`);

    this.logger.info('Moving archive to backup directory...');

    // Move the archive to the backup directory
    await fs.promises.mkdir(backupDir, { recursive: true });
    await fs.promises.cp(path.join(tempDir, `${backupName}.tar.gz`), path.join(backupDir, `${backupName}.tar.gz`));

    // Remove the temp backup folder
    await fs.promises.rm(tempDir, { force: true, recursive: true });

    this.logger.info('Backup completed!');
  };

  public restoreApp = async (appId: string, filename: string) => {
    const restoreDir = path.join('/tmp', appId);
    const archive = path.join(this.dataDir, 'backups', appId, filename);

    this.logger.info('Restoring app from backup...');

    // Verify the app has a backup
    if (!(await pathExists(archive))) {
      throw new Error('The backup file does not exist');
    }

    // Unzip the archive
    await fs.promises.mkdir(restoreDir, { recursive: true });

    this.logger.info('Extracting archive...');
    await this.archiveManager.extractTarGz(archive, restoreDir);

    const appDataDirPath = path.join(this.dataDir, 'apps', appId);
    const appDirPath = path.join(this.dataDir, 'apps', appId);

    // Remove old data directories
    await fs.promises.rm(appDataDirPath, { force: true, recursive: true });
    await fs.promises.rm(appDirPath, { force: true, recursive: true });
    await fs.promises.rm(path.join(this.dataDir, 'user-config', appId), {
      force: true,
      recursive: true,
    });

    await fs.promises.mkdir(appDataDirPath, { recursive: true });
    await fs.promises.mkdir(appDirPath, { recursive: true });

    // Copy data from the backup folder
    await fs.promises.cp(path.join(restoreDir, 'app'), appDirPath, { recursive: true });
    await fs.promises.cp(path.join(restoreDir, 'app-data'), appDataDirPath, { recursive: true });

    // Copy user config foler if it exists
    if (await pathExists(path.join(restoreDir, 'user-config'))) {
      await fs.promises.cp(path.join(restoreDir, 'user-config'), path.join(this.dataDir, 'user-config', appId), { recursive: true });
    }

    // Delete restore folder
    await fs.promises.rm(restoreDir, { force: true, recursive: true });
  };

  /**
   * Delete a backup file
   * @param appId - The app id
   * @param filename - The filename of the backup
   */
  public async deleteBackup(appId: string, filename: string) {
    const backupPath = path.join(this.dataDir, 'backups', sanitizePath(appId), filename);

    if (await pathExists(backupPath)) {
      await fs.promises.unlink(backupPath);
    }
  }

  /**
   * List the backups for an app
   * @param appId - The app id
   * @returns The list of backups
   */
  public async listBackupsByAppId(appId: string) {
    const backupsDir = path.join(this.dataDir, 'backups', sanitizePath(appId));

    if (!(await pathExists(backupsDir))) {
      return [];
    }

    try {
      const list = await fs.promises.readdir(backupsDir);

      const backups = await Promise.all(
        list.map(async (backup) => {
          const stats = await fs.promises.stat(path.join(backupsDir, backup));
          return { id: backup, size: stats.size, date: stats.mtime };
        }),
      );

      return backups;
    } catch (error) {
      this.logger.error(`Error listing backups for app ${appId}: ${error}`);
      return [];
    }
  }
}
