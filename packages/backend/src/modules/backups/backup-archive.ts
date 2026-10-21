import fs from 'node:fs';
import path from 'node:path';
import { pLimit } from '@/common/helpers/file-helpers';
import type { ArchiveEntry } from '@/core/archive/archive.service';
import type { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';

export const migrationMetadataFilename = 'runtipi-migrations.json';

export class BackupArchive {
  constructor(
    private readonly filesystem: FilesystemService,
    private readonly logger: LoggerService,
  ) {}

  public validateRestoreArchiveEntries(entries: ArchiveEntry[]) {
    const entryPaths = new Set<string>();

    for (const entry of entries) {
      if (entry.type !== '-' && entry.type !== 'd') {
        throw new Error('Backup contains unsupported file types');
      }

      const entryPath = this.normalizeArchiveEntryPath(entry.path);

      if (entryPaths.has(entryPath)) {
        throw new Error('Backup contains duplicate file paths');
      }
      entryPaths.add(entryPath);

      if (entryPath === '.') {
        continue;
      }

      const rootName = entryPath.split('/')[0];

      const isMetadata = entryPath === migrationMetadataFilename && entry.type === '-';
      const isAppEntry = rootName === 'app-data' || rootName === 'app' || rootName === 'user-config';
      if (!isMetadata && !isAppEntry) {
        throw new Error('Backup contains unsupported file types');
      }
    }
  }

  private normalizeArchiveEntryPath(entryPath: string) {
    if (path.posix.isAbsolute(entryPath)) {
      throw new Error('Backup contains unsupported file types');
    }

    const normalizedPath = path.posix.normalize(entryPath.replace(/^(\.\/)+/, '')).replace(/\/+$/, '') || '.';

    if (normalizedPath === '..' || normalizedPath.startsWith('../')) {
      throw new Error('Backup contains unsupported file types');
    }

    return normalizedPath;
  }

  public async validateRestoreDirectory(
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
    const rootPath = await runFsOperation(() => fs.promises.realpath(rootDirectory));
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

          const resolvedTarget = await runFsOperation(() => fs.promises.realpath(entryPath)).catch(() => {
            throw new Error('Backup contains unsupported file types');
          });

          if (!this.isPathInsideOrEqual(rootPath, resolvedTarget)) {
            throw new Error('Backup contains unsupported file types');
          }

          const targetStats = await runFsOperation(() => fs.promises.stat(resolvedTarget));
          if (!targetStats.isFile() && !targetStats.isDirectory()) {
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

  public async stageBackupDirectory(source: string, destination: string, name: string, filter?: fs.CopyOptions['filter']) {
    const quarantine = path.join(path.dirname(destination), '.backup-quarantine', path.basename(destination));
    try {
      await this.copySourceToQuarantine(source, quarantine, filter);
    } catch (error) {
      this.logger.error(`Error copying ${name} to backup quarantine:`, error);
      throw new Error(`Failed to copy ${name} for backup`, { cause: error });
    }

    const quarantineStats = await fs.promises.lstat(quarantine);
    if (!quarantineStats.isDirectory()) {
      throw new Error('Backup contains unsupported file types');
    }

    await this.rewriteAbsoluteSymlinks(quarantine, source, quarantine);
    await this.validateRestoreDirectory(quarantine, { allowSymlinks: true, rejectHardLinks: true });

    const copiedToArchive = await this.filesystem.copyDirectory(quarantine, destination, { dereference: true });
    if (!copiedToArchive) {
      throw new Error(`Failed to copy ${name} for backup`);
    }

    if (!(await this.filesystem.removeDirectory(path.dirname(quarantine)))) {
      throw new Error('Failed to remove backup quarantine');
    }
  }

  private async copySourceToQuarantine(source: string, destination: string, filter?: fs.CopyOptions['filter'], filterSource = source): Promise<void> {
    if (process.platform !== 'linux') {
      await this.copySourceToQuarantineOutsideLinux(source, destination, filter, filterSource);
      return;
    }

    if (filter && !(await filter(filterSource, destination))) {
      return;
    }

    const openFlags = fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK;
    let sourceHandle: fs.promises.FileHandle;

    try {
      sourceHandle = await fs.promises.open(source, openFlags);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ELOOP') {
        throw error;
      }

      await fs.promises.mkdir(path.dirname(destination), { recursive: true });
      await fs.promises.symlink(await fs.promises.readlink(source), destination);
      return;
    }

    try {
      const stats = await sourceHandle.stat();
      const sourceHandlePath = `/proc/self/fd/${sourceHandle.fd}`;

      if (stats.isFile()) {
        if (stats.nlink > 1) {
          throw new Error('Backup contains unsupported file types');
        }

        await this.copyFileFromHandle(sourceHandlePath, destination);
        return;
      }
      if (!stats.isDirectory()) {
        throw new Error('Backup contains unsupported file types');
      }

      await fs.promises.mkdir(destination, { recursive: true });
      const directory = await fs.promises.opendir(sourceHandlePath);
      for await (const entry of directory) {
        await this.copySourceToQuarantine(
          path.join(sourceHandlePath, entry.name),
          path.join(destination, entry.name),
          filter,
          path.join(filterSource, entry.name),
        );
      }
    } finally {
      await sourceHandle.close().catch((error) => this.logger.warn(`Failed to close backup file ${source}`, error));
    }
  }

  public async copyRestoreArchive(source: string, destination: string): Promise<void> {
    if (process.platform !== 'linux') {
      const stats = await fs.promises.lstat(source);
      if (!stats.isFile()) {
        throw new Error('The backup file does not exist');
      }

      await fs.promises.copyFile(source, destination);
      return;
    }

    const openFlags = fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK;
    let sourceHandle: fs.promises.FileHandle;

    try {
      sourceHandle = await fs.promises.open(source, openFlags);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT' || code === 'ELOOP') {
        throw new Error('The backup file does not exist');
      }
      throw error;
    }

    try {
      if (!(await sourceHandle.stat()).isFile()) {
        throw new Error('The backup file does not exist');
      }

      await this.copyFileFromHandle(`/proc/self/fd/${sourceHandle.fd}`, destination);
    } finally {
      await sourceHandle.close().catch((error) => this.logger.warn(`Failed to close backup file ${source}`, error));
    }
  }

  private async copyFileFromHandle(sourceHandlePath: string, destination: string): Promise<void> {
    await fs.promises.mkdir(path.dirname(destination), { recursive: true });
    await fs.promises.copyFile(sourceHandlePath, destination);
  }

  private async copySourceToQuarantineOutsideLinux(
    source: string,
    destination: string,
    filter?: fs.CopyOptions['filter'],
    filterSource = source,
  ): Promise<void> {
    if (filter && !(await filter(filterSource, destination))) {
      return;
    }

    const stats = await fs.promises.lstat(source);
    if (stats.isSymbolicLink()) {
      await fs.promises.mkdir(path.dirname(destination), { recursive: true });
      await fs.promises.symlink(await fs.promises.readlink(source), destination);
      return;
    }

    if (stats.isFile()) {
      if (stats.nlink > 1) {
        throw new Error('Backup contains unsupported file types');
      }

      await fs.promises.mkdir(path.dirname(destination), { recursive: true });
      await fs.promises.copyFile(source, destination);
      return;
    }

    if (!stats.isDirectory()) {
      throw new Error('Backup contains unsupported file types');
    }

    await fs.promises.mkdir(destination, { recursive: true });
    const entries = await fs.promises.readdir(source);
    for (const entry of entries) {
      const entrySource = path.join(source, entry);
      const entryDestination = path.join(destination, entry);
      const entryFilterSource = path.join(filterSource, entry);
      await this.copySourceToQuarantineOutsideLinux(entrySource, entryDestination, filter, entryFilterSource);
    }
  }

  private async rewriteAbsoluteSymlinks(directory: string, sourceRoot: string, quarantineRoot: string): Promise<void> {
    const entries = await fs.promises.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await this.rewriteAbsoluteSymlinks(entryPath, sourceRoot, quarantineRoot);
        continue;
      }

      if (!entry.isSymbolicLink()) {
        continue;
      }

      const target = await fs.promises.readlink(entryPath);
      const relativeEntryPath = path.relative(quarantineRoot, entryPath);
      const sourceEntryPath = path.join(sourceRoot, relativeEntryPath);
      const sourceTarget = path.resolve(path.dirname(sourceEntryPath), target);
      if (!this.isPathInsideOrEqual(sourceRoot, sourceTarget)) {
        throw new Error('Backup contains unsupported file types');
      }

      const sourceRelativeTarget = path.relative(sourceRoot, sourceTarget);
      const quarantineTarget = path.join(quarantineRoot, sourceRelativeTarget);
      const relativeTarget = path.relative(path.dirname(entryPath), quarantineTarget) || '.';
      await fs.promises.unlink(entryPath);
      await fs.promises.symlink(relativeTarget, entryPath);
    }
  }
}
