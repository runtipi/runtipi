import fs from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { FilesystemService } from '../filesystem.service';

afterEach(() => vi.restoreAllMocks());

test('removes the created temporary directory when chmod fails', async () => {
  const logger = { error: vi.fn() } as never;
  const filesystem = new FilesystemService(logger);
  const chmodError = new Error('chmod failed');
  const directory = '/tmp/runtipi-created';
  vi.spyOn(fs.promises, 'mkdtemp').mockResolvedValue(directory);
  vi.spyOn(fs.promises, 'chmod').mockRejectedValue(chmodError);
  const removeDirectory = vi.spyOn(fs.promises, 'rmdir').mockRejectedValue(new Error('cleanup failed'));

  await expect(filesystem.createTempDirectory('/tmp/runtipi-')).rejects.toThrow(chmodError);
  expect(removeDirectory).toHaveBeenCalledWith(directory);
});

test('removes the created temporary directory when it is not private', async () => {
  const logger = { error: vi.fn() } as never;
  const filesystem = new FilesystemService(logger);
  const directory = '/tmp/runtipi-created';
  vi.spyOn(fs.promises, 'mkdtemp').mockResolvedValue(directory);
  vi.spyOn(fs.promises, 'chmod').mockResolvedValue(undefined);
  vi.spyOn(fs.promises, 'stat').mockResolvedValue({ mode: 0o755 } as never);
  const removeDirectory = vi.spyOn(fs.promises, 'rmdir').mockResolvedValue(undefined);

  await expect(filesystem.createTempDirectory('/tmp/runtipi-')).rejects.toThrow('not private');
  expect(removeDirectory).toHaveBeenCalledWith(directory);
});
