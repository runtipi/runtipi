import { spawnAsync } from '@/common/helpers/exec-helpers';
import type { LoggerService } from '@/core/logger/logger.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArchiveService } from '../archive.service';

vi.mock('@/common/helpers/exec-helpers', () => ({
  spawnAsync: vi.fn(),
}));

const spawnAsyncMock = vi.mocked(spawnAsync);

const createLogger = () =>
  ({
    debug: vi.fn(),
  }) as unknown as LoggerService;

describe('ArchiveService', () => {
  beforeEach(() => {
    spawnAsyncMock.mockReset();
  });

  it('lists archive paths and types from production tar output', async () => {
    const archive = '/data/backups/_user/demoapp3/demoapp3-symlink-poc.tar.gz';
    const verboseOutput = [
      'drwxr-xr-x root/root         0 2026-06-10 18:20:41 app-data/',
      'drwxr-xr-x root/root         0 2026-06-10 18:20:41 app/',
      'drwxr-xr-x root/root         0 2026-06-10 18:20:41 user-config/',
      'lrwxr-xr-x root/root         0 2026-06-10 18:20:41 user-config/app.env -> /data/state/proof.txt',
    ].join('\n');
    const pathOutput = ['app-data/', 'app/', 'user-config/', 'user-config/app.env'].join('\n');

    spawnAsyncMock
      .mockResolvedValueOnce({ stdout: 'application/gzip\n', stderr: '' })
      .mockResolvedValueOnce({ stdout: `${verboseOutput}\n`, stderr: '' })
      .mockResolvedValueOnce({ stdout: `${pathOutput}\n`, stderr: '' });

    const archiveService = new ArchiveService(createLogger());

    await expect(archiveService.listTarGz(archive)).resolves.toEqual([
      { path: 'app-data/', type: 'd' },
      { path: 'app/', type: 'd' },
      { path: 'user-config/', type: 'd' },
      { path: 'user-config/app.env', type: 'l' },
    ]);

    expect(spawnAsyncMock).toHaveBeenNthCalledWith(2, 'tar', ['-tzvf', archive]);
    expect(spawnAsyncMock).toHaveBeenNthCalledWith(3, 'tar', ['-tzf', archive]);
  });
});
