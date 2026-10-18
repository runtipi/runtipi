import type { LoggerService } from '@/core/logger/logger.service';
import type Dockerode from 'dockerode';
import si from 'systeminformation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { HostMemoryService } from '../host-memory.service';
import { getContainerGroup, SystemMetricsService } from '../system-metrics.service';

const GB = 1024 ** 3;

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

class TestMetricsService extends SystemMetricsService {
  readonly hostMemoryService: TestHostMemoryService;

  constructor(docker: Dockerode, files: Record<string, string>) {
    const hostMemory = new TestHostMemoryService(docker, files);
    super(mock<LoggerService>(), docker, hostMemory);
    this.hostMemoryService = hostMemory;
  }
}

const createDocker = (containers: { id: string; labels: Record<string, string>; memory: number; cpuNs?: number }[]) => {
  const docker = mock<Dockerode>();
  let tick = 0;

  docker.listContainers.mockResolvedValue(containers.map((c) => ({ Id: c.id, Labels: c.labels, Names: [`/${c.id}`] }) as never));
  docker.getContainer.mockImplementation((id: string) => {
    const container = containers.find((c) => c.id === id);
    return {
      stats: async () => ({
        read: new Date(Date.UTC(2024, 0, 1, 0, 0, tick++ * 10)).toISOString(),
        cpu_stats: { cpu_usage: { total_usage: (container?.cpuNs ?? 0) * tick } },
        memory_stats: { usage: container?.memory ?? 0, stats: { inactive_file: 0 } },
        networks: {},
      }),
    } as never;
  });

  return docker;
};

describe('SystemMetricsService', () => {
  beforeEach(() => {
    vi.spyOn(si, 'fsSize').mockResolvedValue([
      { fs: '/dev/sda1', type: 'ext4', size: 100 * GB, used: 40 * GB, available: 60 * GB, use: 40, mount: '/data/media', rw: true },
      { fs: '/dev/sda1', type: 'ext4', size: 100 * GB, used: 40 * GB, available: 60 * GB, use: 40, mount: '/', rw: true },
      { fs: 'lxcfs', type: 'fuse.lxcfs', size: 1, used: 0, available: 1, use: 0, mount: '/host/proc/meminfo', rw: false },
    ]);
    vi.spyOn(si, 'cpuTemperature').mockResolvedValue({ main: null } as never);
    vi.spyOn(si, 'currentLoad').mockResolvedValue({ currentLoad: 12.5 } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses /proc/meminfo on a regular host', async () => {
    const service = new TestMetricsService(createDocker([]), {
      '/host/proc/meminfo': 'MemTotal: 8388608 kB\nMemFree: 1048576 kB\nMemAvailable: 6291456 kB\n',
    });
    service.onModuleInit();
    service.onModuleDestroy();

    const sample = await service.getLatest();
    expect(sample?.memoryUsed).toBe(2 * GB);
    expect(sample?.memoryTotal).toBe(8 * GB);
    expect(sample?.cpu).toBe(12.5);
    expect(sample?.disks).toEqual([{ fs: '/dev/sda1', mount: '/', type: 'ext4', size: 100 * GB, used: 40 * GB, available: 60 * GB }]);
  });

  it('reports per app usage', async () => {
    const docker = createDocker([
      { id: 'a', labels: { 'runtipi.appurn': 'nextcloud:migrated' }, memory: 2 * GB },
      { id: 'b', labels: { 'runtipi.appurn': 'nextcloud:migrated' }, memory: GB },
      { id: 'c', labels: { 'com.docker.compose.project': 'runtipi' }, memory: GB },
    ]);
    const service = new TestMetricsService(docker, {});
    service.onModuleInit();
    service.onModuleDestroy();
    await service.getLatest();

    expect(service.getApps().map((app) => [app.id, app.containers, app.memory])).toEqual([
      ['nextcloud:migrated', 2, 3 * GB],
      ['runtipi', 1, GB],
    ]);
  });

  it('estimates memory from the sampled containers inside LXC', async () => {
    const docker = createDocker([
      { id: 'a', labels: { 'runtipi.appurn': 'nextcloud:migrated' }, memory: 2 * GB },
      { id: 'b', labels: { 'com.docker.compose.project': 'runtipi' }, memory: GB },
    ]);
    const service = new TestMetricsService(docker, {
      '/proc/self/mountinfo': '1010 1000 0:60 /proc/meminfo /host/proc/meminfo ro,relatime - fuse.lxcfs lxcfs rw',
      '/host/proc/meminfo': 'MemTotal: 8388608 kB\nMemAvailable: 7864320 kB\n',
    });
    await service.hostMemoryService.onModuleInit();
    service.onModuleInit();
    service.onModuleDestroy();

    const sample = await service.getLatest();
    expect(sample).toMatchObject({ memoryUsed: 3 * GB, memoryTotal: 8 * GB, memorySource: 'containers' });
    // Container stats are read once per sample, not again by the memory estimate
    expect(docker.getContainer).toHaveBeenCalledTimes(2);
  });

  it('groups containers by app', () => {
    expect(getContainerGroup({ Labels: { 'runtipi.appurn': 'jellyfin:migrated' }, Names: ['/jellyfin'] })).toBe('jellyfin:migrated');
    expect(getContainerGroup({ Labels: {}, Names: ['/runtipi-db'] })).toBe('runtipi');
    expect(getContainerGroup({ Labels: {}, Names: ['/portainer'] })).toBe('other');
  });
});
