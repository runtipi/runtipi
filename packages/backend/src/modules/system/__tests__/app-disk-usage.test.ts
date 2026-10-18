import { describe, expect, it, vi } from 'vitest';
import { AppDiskUsage, type AppDiskUsageDeps, parseDockerDiskUsage } from '../metrics/app-disk-usage';

const createDeps = (overrides: Partial<AppDiskUsageDeps> = {}): AppDiskUsageDeps => ({
  listApps: async () => ['jellyfin:migrated', 'sonarr:migrated', 'broken:migrated'],
  getAppStorage: async (urn) => {
    if (urn === 'jellyfin:migrated') return { binds: ['/host/app-data/jellyfin', '/host/media'], volumes: [], images: [] };
    if (urn === 'sonarr:migrated') return { binds: ['/host/app-data/sonarr', '/host/media/tv', '/mnt/nas'], volumes: ['sonarr_db'], images: [] };
    return null;
  },
  getDockerDiskUsage: async () => ({
    Volumes: [{ Name: 'sonarr_db', UsageData: { Size: 50 } }],
    Containers: [{ SizeRw: 7, Labels: { 'runtipi.appurn': 'sonarr:migrated' } }],
    Images: [],
  }),
  getOwnMounts: async () => [
    { source: '/host/app-data', destination: '/app-data' },
    { source: '/host/media', destination: '/data/media' },
  ],
  measure: vi.fn(async (path: string) => ({ '/app-data/jellyfin': 100, '/app-data/sonarr': 200, '/data/media': 1000 })[path] ?? null),
  ...overrides,
});

describe('AppDiskUsage', () => {
  it('measures each directory tree once through the runtipi mounts', async () => {
    const deps = createDeps();
    const usage = new AppDiskUsage(deps);
    await usage.refresh();

    // /host/media/tv is inside /host/media and /mnt/nas is not mounted into runtipi
    expect(deps.measure).toHaveBeenCalledTimes(3);
    expect(deps.measure).toHaveBeenCalledWith('/data/media');

    const result = usage.get();
    expect(result?.apps.get('jellyfin:migrated')).toMatchObject({ total: 100, data: 100, shared: ['data:/host/media'] });
    expect(result?.apps.get('sonarr:migrated')).toMatchObject({ total: 257, data: 200, volumes: 50, containers: 7, unmeasured: ['/mnt/nas'] });
    expect(result?.apps.has('broken:migrated')).toBe(false);
    expect(result?.shared).toEqual([
      { id: 'data:/host/media', kind: 'data', sources: ['/host/media'], size: 1000, apps: ['jellyfin:migrated', 'sonarr:migrated'] },
    ]);
  });

  it('runs a single computation at a time', async () => {
    const deps = createDeps();
    const listApps = vi.spyOn(deps, 'listApps');
    const usage = new AppDiskUsage(deps);

    await Promise.all([usage.refresh(), usage.refresh()]);

    expect(listApps).toHaveBeenCalledTimes(1);
  });
});

describe('parseDockerDiskUsage', () => {
  it('reads volume, container and unique image sizes', () => {
    const { volumeSizes, containerSizes, imageSizes } = parseDockerDiskUsage({
      Volumes: [
        { Name: 'a', UsageData: { Size: 10 } },
        { Name: 'not-computed', UsageData: { Size: -1 } },
      ],
      Containers: [
        { SizeRw: 5, Labels: { 'runtipi.appurn': 'x:s' } },
        { SizeRw: 6, Labels: { 'runtipi.appurn': 'x:s' } },
        { SizeRw: 100, Labels: {} },
      ],
      Images: [
        { Size: 100, SharedSize: 60, RepoTags: ['postgres:14', 'docker.io/library/postgres:latest'] },
        { Size: 50, SharedSize: -1, RepoTags: ['<none>:<none>'] },
      ],
    });

    expect(Object.fromEntries(volumeSizes)).toEqual({ a: 10 });
    expect(Object.fromEntries(containerSizes)).toEqual({ 'x:s': 11 });
    expect(Object.fromEntries(imageSizes)).toEqual({ 'postgres:14': 40, 'postgres:latest': 40 });
  });

  it('handles a missing result', () => {
    expect(parseDockerDiskUsage(null).volumeSizes.size).toBe(0);
  });
});
