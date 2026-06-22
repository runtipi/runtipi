import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import si from 'systeminformation';
import { SystemService } from '../system.service';

describe('SystemService.getSystemLoad memory fallback (runtipi/runtipi#2445)', () => {
  let service: SystemService;
  let readTextFile: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    readTextFile = vi.fn();
    // Clear any spies left over from earlier tests in this file so call-count
    // assertions are deterministic across tests.
    vi.restoreAllMocks();
    const fakeFilesystem = { readTextFile } as unknown as FilesystemService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        SystemService,
        { provide: FilesystemService, useValue: fakeFilesystem },
        { provide: LoggerService, useValue: mock<LoggerService>() },
        { provide: ConfigurationService, useValue: { get: vi.fn() } },
      ],
    }).compile();

    service = moduleRef.get(SystemService);
  });

  it('uses /host/proc/meminfo when the bind-mount is present and well-formed', async () => {
    const sample = [
      'MemTotal:       16384000 kB',
      'MemFree:         1234000 kB',
      'MemAvailable:   8421000 kB',
      'Buffers:          234000 kB',
      'Cached:          4321000 kB',
    ].join('\n');
    readTextFile.mockResolvedValueOnce(sample);

    const siMemSpy = vi.spyOn(si, 'mem');

    const result = await service.getSystemLoad();

    expect(readTextFile).toHaveBeenCalledWith('/host/proc/meminfo');
    expect(siMemSpy).not.toHaveBeenCalled();
    // 16384000 kB -> bytes = 16,777,216,000 -> /1024^3 -> 15.625 -> round to 16.
    // Used = 16384000 - 8421000 = 7963000 kB ≈ 7.59 GB → round to 8.
    // percent = 8/16 = 50%.
    expect(result.memoryTotal).toBe(16);
    expect(result.percentUsedMemory).toBe(50);
  });

  it('falls back to si.mem() when /host/proc/meminfo is unreadable (Proxmox LXC without the bind mount)', async () => {
    readTextFile.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

    const siMemSpy = vi.spyOn(si, 'mem').mockResolvedValueOnce({
      total: 16 * 1024 * 1024 * 1024,
      free: 8 * 1024 * 1024 * 1024,
      used: 8 * 1024 * 1024 * 1024,
      active: 0,
      available: 8 * 1024 * 1024 * 1024,
      buffcache: 0,
      buffers: 0,
      cached: 0,
      slab: 0,
      reclaimable: 0,
      swaptotal: 0,
      swapused: 0,
      swapfree: 0,
      writeback: null,
      dirty: null,
    } as never);

    const result = await service.getSystemLoad();

    expect(readTextFile).toHaveBeenCalledWith('/host/proc/meminfo');
    expect(siMemSpy).toHaveBeenCalledTimes(1);
    expect(result.memoryTotal).toBe(16);
    expect(result.percentUsedMemory).toBe(50);
  });

  it('falls back to si.mem() when /host/proc/meminfo is empty (regex yields 0)', async () => {
    readTextFile.mockResolvedValueOnce('');

    const siMemSpy = vi.spyOn(si, 'mem').mockResolvedValueOnce({
      total: 8 * 1024 * 1024 * 1024,
      free: 4 * 1024 * 1024 * 1024,
      used: 4 * 1024 * 1024 * 1024,
      active: 0,
      available: 4 * 1024 * 1024 * 1024,
      buffcache: 0,
      buffers: 0,
      cached: 0,
      slab: 0,
      reclaimable: 0,
      swaptotal: 0,
      swapused: 0,
      swapfree: 0,
      writeback: null,
      dirty: null,
    } as never);

    const result = await service.getSystemLoad();

    expect(siMemSpy).toHaveBeenCalledTimes(1);
    expect(result.memoryTotal).toBe(8);
    expect(result.percentUsedMemory).toBe(50);
  });

  it('returns 0% memory when both /host/proc/meminfo and si.mem() fail', async () => {
    readTextFile.mockRejectedValueOnce(new Error('ENOENT'));
    const siMemSpy = vi.spyOn(si, 'mem').mockRejectedValueOnce(new Error('si.mem() failed'));

    const result = await service.getSystemLoad();

    expect(siMemSpy).toHaveBeenCalledTimes(1);
    expect(result.memoryTotal).toBe(0);
    expect(result.percentUsedMemory).toBe(0);
  });
});
