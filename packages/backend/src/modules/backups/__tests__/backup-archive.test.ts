import type { ArchiveEntry } from '@/core/archive/archive.service';
import type { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { BackupArchive } from '../backup-archive';

test('accepts legacy archives containing only directories and regular files', () => {
  const archive = new BackupArchive(mock<FilesystemService>(), mock<LoggerService>());

  expect(() =>
    archive.validateRestoreArchiveEntries([
      { path: './', type: 'd' },
      { path: './app-data/', type: 'd' },
      { path: './app-data/data/state.db', type: '-' },
      { path: './app/', type: 'd' },
      { path: './app/config.json', type: '-' },
      { path: './user-config/', type: 'd' },
      { path: './user-config/app.env', type: '-' },
      { path: './runtipi-migrations.json', type: '-' },
    ]),
  ).not.toThrow();
});

test.each(['app-data', 'app', 'user-config'])('accepts symlinks within %s archives', (directory) => {
  const archive = new BackupArchive(mock<FilesystemService>(), mock<LoggerService>());

  expect(() =>
    archive.validateRestoreArchiveEntries([
      { path: './', type: 'd' },
      { path: `./${directory}/`, type: 'd' },
      { path: `./${directory}/container-link`, type: 'l' },
    ]),
  ).not.toThrow();
});

test.each(['l', '-'])('rejects archive entries beneath a %s entry regardless of ordering', (type) => {
  const archive = new BackupArchive(mock<FilesystemService>(), mock<LoggerService>());
  const entries: ArchiveEntry[] = [
    { path: './app-data/parent', type },
    { path: './app-data/parent/nested/file', type: '-' },
  ];

  expect(() => archive.validateRestoreArchiveEntries(entries)).toThrow('Backup contains unsupported file types');
  expect(() => archive.validateRestoreArchiveEntries([...entries].reverse())).toThrow('Backup contains unsupported file types');
});

test.each(['.', 'app-data', 'app', 'user-config'])('rejects symlinks replacing the archive root %s', (root) => {
  const archive = new BackupArchive(mock<FilesystemService>(), mock<LoggerService>());

  expect(() => archive.validateRestoreArchiveEntries([{ path: root, type: 'l' }])).toThrow('Backup contains unsupported file types');
});

test('rejects normalized duplicate paths between files and symlinks', () => {
  const archive = new BackupArchive(mock<FilesystemService>(), mock<LoggerService>());

  expect(() =>
    archive.validateRestoreArchiveEntries([
      { path: './app-data/data', type: 'l' },
      { path: 'app-data/data', type: '-' },
    ]),
  ).toThrow('Backup contains duplicate file paths');
});
