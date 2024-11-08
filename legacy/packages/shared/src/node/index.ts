import { execAsync } from './helpers/exec-async';
import { pathExists } from './helpers/fs-helpers';

import { Logger } from './logger/FileLogger';
import type { ILogger } from './logger/Logger.interface';
import { AppDataService, type IAppDataService } from './modules/app/app-data-service';
import { AppFileAccessor, type IAppFileAccessor } from './modules/app/app-file-accessor';
import { BackupManager, type IBackupManager } from './modules/backup/backup-manager';

export {
  execAsync,
  pathExists,
  Logger,
  AppDataService,
  type ILogger,
  type IAppDataService,
  AppFileAccessor,
  type IAppFileAccessor,
  BackupManager,
  type IBackupManager,
};
