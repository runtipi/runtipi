import fs from 'node:fs';
import path from 'node:path';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';
import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { BackupArchive } from '../backup-archive';

vi.unmock('fs');
vi.unmock('node:fs');

const createLogger = () => mock<LoggerService>();

const writeFile = async (filePath: string, content: string) => {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, content);
};

describe('BackupArchive Linux filesystem security', () => {
  it.runIf(process.platform === 'linux')('copies a regular file from its no-follow handle when the source is swapped', async () => {
    const rootDir = await fs.promises.mkdtemp('/tmp/runtipi-backup-source-');
    const source = path.join(rootDir, 'source.txt');
    const destination = path.join(rootDir, 'quarantine', 'source.txt');
    const movedSource = path.join(rootDir, 'source-before-swap.txt');
    const externalFile = path.join(rootDir, 'external.txt');
    const logger = createLogger();
    const manager = new BackupArchive(new FilesystemService(logger), logger);
    const copySourceToQuarantine = (
      manager as unknown as { copySourceToQuarantine: (source: string, destination: string) => Promise<void> }
    ).copySourceToQuarantine.bind(manager);
    const originalCopyFile = fs.promises.copyFile;
    const copyFileSpy = vi.spyOn(fs.promises, 'copyFile');
    let swapped = false;

    try {
      await fs.promises.writeFile(source, 'safe');
      await fs.promises.writeFile(externalFile, 'external');
      copyFileSpy.mockImplementation(async (copySource, copyDestination, mode) => {
        if (!swapped) {
          swapped = true;
          await fs.promises.rename(source, movedSource);
          await fs.promises.symlink(externalFile, source);
        }
        await originalCopyFile(copySource, copyDestination, mode);
      });

      await copySourceToQuarantine(source, destination);

      await expect(fs.promises.readFile(destination, 'utf8')).resolves.toBe('safe');
    } finally {
      copyFileSpy.mockRestore();
      await fs.promises.rm(rootDir, { recursive: true, force: true });
    }
  });

  it.runIf(process.platform === 'linux')('traverses a directory from its no-follow handle when the source is swapped', async () => {
    const rootDir = await fs.promises.mkdtemp('/tmp/runtipi-backup-source-');
    const source = path.join(rootDir, 'source');
    const destination = path.join(rootDir, 'quarantine', 'source');
    const movedSource = path.join(rootDir, 'source-before-swap');
    const externalDirectory = path.join(rootDir, 'external');
    const logger = createLogger();
    const manager = new BackupArchive(new FilesystemService(logger), logger);
    const copySourceToQuarantine = (
      manager as unknown as { copySourceToQuarantine: (source: string, destination: string) => Promise<void> }
    ).copySourceToQuarantine.bind(manager);
    const originalMkdir = fs.promises.mkdir;
    const mkdirSpy = vi.spyOn(fs.promises, 'mkdir');
    let swapped = false;

    try {
      await writeFile(path.join(source, 'safe.txt'), 'safe');
      await writeFile(path.join(externalDirectory, 'external.txt'), 'external');
      mkdirSpy.mockImplementation(async (directory, options) => {
        if (!swapped && directory === destination) {
          swapped = true;
          await fs.promises.rename(source, movedSource);
          await fs.promises.symlink(externalDirectory, source);
        }
        return originalMkdir(directory, options);
      });

      await copySourceToQuarantine(source, destination);

      await expect(fs.promises.readFile(path.join(destination, 'safe.txt'), 'utf8')).resolves.toBe('safe');
      await expect(fs.promises.access(path.join(destination, 'external.txt'))).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      mkdirSpy.mockRestore();
      await fs.promises.rm(rootDir, { recursive: true, force: true });
    }
  });

  it.runIf(process.platform === 'linux')('rejects a quarantine root that becomes a symlink before rewriting it', async () => {
    const rootDir = await fs.promises.mkdtemp('/tmp/runtipi-backup-source-');
    const source = path.join(rootDir, 'source');
    const destination = path.join(rootDir, 'backup', 'app-data');
    const movedSource = path.join(rootDir, 'source-before-swap');
    const externalDirectory = path.join(rootDir, 'external');
    const externalFile = path.join(externalDirectory, 'external.txt');
    const logger = createLogger();
    const manager = new BackupArchive(new FilesystemService(logger), logger);
    const stageBackupDirectory = (
      manager as unknown as { stageBackupDirectory: (source: string, destination: string, name: string) => Promise<void> }
    ).stageBackupDirectory.bind(manager);
    const originalOpen = fs.promises.open;
    const openSpy = vi.spyOn(fs.promises, 'open');
    let swapped = false;

    try {
      await writeFile(path.join(source, 'safe.txt'), 'safe');
      await writeFile(externalFile, 'external');
      openSpy.mockImplementation(async (file, flags, mode) => {
        if (!swapped && file === source) {
          swapped = true;
          await fs.promises.rename(source, movedSource);
          await fs.promises.symlink(externalDirectory, source);
        }
        return originalOpen(file, flags, mode);
      });

      await expect(stageBackupDirectory(source, destination, 'app data')).rejects.toThrow('Backup contains unsupported file types');
      await expect(fs.promises.readFile(externalFile, 'utf8')).resolves.toBe('external');
      await expect(fs.promises.readdir(externalDirectory)).resolves.toEqual(['external.txt']);
    } finally {
      openSpy.mockRestore();
      await fs.promises.rm(rootDir, { recursive: true, force: true });
    }
  });
});
