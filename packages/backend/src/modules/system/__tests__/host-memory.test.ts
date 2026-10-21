import type { LoggerService } from '@/core/logger/logger.service';
import type Dockerode from 'dockerode';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { HostMemoryService } from '../host-memory.service';
import { CgroupReader, isServedByLxcfs } from '../metrics/cgroup';
import { getUsedMemory, parseMeminfo } from '../metrics/meminfo';

const GB = 1024 ** 3;

const LXCFS_MOUNTINFO = '1010 1000 0:60 /proc/meminfo /host/proc/meminfo ro,relatime - fuse.lxcfs lxcfs rw';
// What lxcfs returns to the runtipi container: the LXC limit, but only the runtipi container usage
const LXCFS_MEMINFO = 'MemTotal: 8388608 kB\nMemFree: 7864320 kB\nMemAvailable: 7864320 kB\n';

class TestHostMemoryService extends HostMemoryService {
  constructor(
    docker: Dockerode,
    private readonly files: Record<string, string>,
  ) {
    super(mock<LoggerService>(), docker);
  }

  protected override readFile(filePath: string) {
    return Promise.resolve(this.files[filePath] ?? null);
  }
}

const createDocker = (memories: number[]) => {
  const docker = mock<Dockerode>();
  docker.listContainers.mockResolvedValue(memories.map((_, i) => ({ Id: String(i) }) as never));
  docker.getContainer.mockImplementation(
    (id: string) =>
      ({
        stats: async () => ({ memory_stats: { usage: (memories[Number(id)] ?? 0) + 100, stats: { inactive_file: 100 } } }),
      }) as never,
  );
  return docker;
};

describe('meminfo', () => {
  const meminfo = (lines: Record<string, number>) =>
    Object.entries(lines)
      .map(([key, kb]) => `${key}:     ${kb} kB`)
      .join('\n');

  it('computes used memory from MemAvailable', () => {
    const info = parseMeminfo(meminfo({ MemTotal: 8 * 1024 * 1024, MemFree: 1024 * 1024, MemAvailable: 6 * 1024 * 1024 }));

    expect(info.total).toBe(8 * GB);
    expect(getUsedMemory(info)).toBe(2 * GB);
  });

  it('falls back to free/buffers/cache when MemAvailable is missing', () => {
    const info = parseMeminfo(
      meminfo({ MemTotal: 8 * 1024 * 1024, MemFree: 4 * 1024 * 1024, Buffers: 512 * 1024, Cached: 1024 * 1024, SReclaimable: 512 * 1024, Shmem: 0 }),
    );

    expect(info.available).toBeNull();
    expect(getUsedMemory(info)).toBe(2 * GB);
  });
});

describe('CgroupReader', () => {
  const reader = (files: Record<string, string>) => new CgroupReader('/cg', async (p) => files[p] ?? null);

  it('reads cgroup v2 memory without inactive file cache', async () => {
    const memory = await reader({
      '/cg/memory.current': `${3 * GB}\n`,
      '/cg/memory.stat': `anon 100\ninactive_file ${GB}\nactive_file 5\n`,
      '/cg/memory.max': `${8 * GB}\n`,
    }).getMemory();

    expect(memory).toEqual({ used: 2 * GB, limit: 8 * GB });
  });

  it('treats memory.max "max" as unlimited', async () => {
    expect(await reader({ '/cg/memory.current': '100', '/cg/memory.max': 'max\n' }).getMemory()).toEqual({ used: 100, limit: null });
  });

  it('reads cgroup v1 memory', async () => {
    const memory = await reader({
      '/cg/memory/memory.usage_in_bytes': `${3 * GB}`,
      '/cg/memory/memory.stat': `total_inactive_file ${GB}`,
      '/cg/memory/memory.limit_in_bytes': '9223372036854771712',
    }).getMemory();

    expect(memory).toEqual({ used: 2 * GB, limit: null });
  });

  it('returns null when the cgroup has no memory accounting (root cgroup)', async () => {
    expect(await reader({ '/cg/cpu.stat': 'usage_usec 1' }).getMemory()).toBeNull();
  });
});

describe('isServedByLxcfs', () => {
  it('detects lxcfs mounts', () => {
    const mountinfo = ['1000 900 0:52 / / rw,relatime - overlay overlay rw', LXCFS_MOUNTINFO].join('\n');

    expect(isServedByLxcfs(mountinfo, '/host/proc/meminfo')).toBe(true);
    expect(isServedByLxcfs('1010 1000 0:5 /meminfo /host/proc/meminfo ro - proc proc rw', '/host/proc/meminfo')).toBe(false);
    expect(isServedByLxcfs(null, '/host/proc/meminfo')).toBe(false);
  });
});

describe('HostMemoryService', () => {
  it('uses /proc/meminfo on a regular host', async () => {
    const service = new TestHostMemoryService(createDocker([]), {
      '/host/proc/meminfo': 'MemTotal: 8388608 kB\nMemFree: 1048576 kB\nMemAvailable: 6291456 kB\n',
    });
    await service.onModuleInit();

    expect(await service.getMemory()).toEqual({ used: 2 * GB, total: 8 * GB, source: 'host' });
  });

  it('ignores the cgroup outside of LXC', async () => {
    const service = new TestHostMemoryService(createDocker([]), {
      '/host/proc/meminfo': 'MemTotal: 8388608 kB\nMemAvailable: 6291456 kB\n',
      '/host/sys/fs/cgroup/memory/memory.usage_in_bytes': `${7 * GB}`,
    });
    await service.onModuleInit();

    expect((await service.getMemory()).source).toBe('host');
  });

  it('sums container memory inside LXC when the cgroup is not mounted', async () => {
    const service = new TestHostMemoryService(createDocker([2 * GB, GB]), {
      '/proc/self/mountinfo': LXCFS_MOUNTINFO,
      '/host/proc/meminfo': LXCFS_MEMINFO,
    });
    await service.onModuleInit();

    expect(await service.getMemory()).toEqual({ used: 3 * GB, total: 8 * GB, source: 'containers' });
  });

  it('uses the LXC cgroup when it is mounted', async () => {
    const service = new TestHostMemoryService(createDocker([]), {
      '/proc/self/mountinfo': LXCFS_MOUNTINFO,
      '/host/proc/meminfo': LXCFS_MEMINFO,
      '/host/sys/fs/cgroup/memory.current': `${5 * GB}`,
      '/host/sys/fs/cgroup/memory.stat': `inactive_file ${GB}`,
      '/host/sys/fs/cgroup/memory.max': `${6 * GB}`,
    });
    await service.onModuleInit();

    expect(await service.getMemory()).toEqual({ used: 4 * GB, total: 6 * GB, source: 'cgroup' });
  });
});
