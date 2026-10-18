import { describe, expect, it } from 'vitest';
import {
  type AppStorage,
  attributeDisk,
  groupPaths,
  isAppDataPath,
  normalizeImage,
  parseComposeStorage,
  removeNestedPaths,
  translateHostPath,
} from '../metrics/disk-attribution';

const ROOT = '/home/user/runtipi';
const GB = 1024 ** 3;

const storage = (binds: string[] = [], volumes: string[] = [], images: string[] = []): AppStorage => ({ binds, volumes, images });

describe('isAppDataPath', () => {
  it('accepts app data and media folders', () => {
    expect(isAppDataPath(`${ROOT}/app-data/migrated/nextcloud/data`, ROOT)).toBe(true);
    expect(isAppDataPath('/mnt/nas/movies', ROOT)).toBe(true);
  });

  it('rejects system paths, the root and parents of the runtipi folder', () => {
    expect(isAppDataPath('/var/run/docker.sock', ROOT)).toBe(false);
    expect(isAppDataPath('/etc/localtime', ROOT)).toBe(false);
    expect(isAppDataPath('/proc', ROOT)).toBe(false);
    expect(isAppDataPath('/', ROOT)).toBe(false);
    expect(isAppDataPath('/home', ROOT)).toBe(false);
    expect(isAppDataPath(ROOT, ROOT)).toBe(false);
    expect(isAppDataPath('/var/lib/docker/volumes', ROOT)).toBe(false);
  });

  it('does not confuse paths sharing a prefix', () => {
    expect(isAppDataPath('/etcetera', ROOT)).toBe(true);
    expect(isAppDataPath('/home/user/runtipi-media', ROOT)).toBe(true);
  });
});

describe('parseComposeStorage', () => {
  it('extracts binds, named volumes and images from a resolved compose config', () => {
    const result = parseComposeStorage(
      {
        services: {
          nextcloud: {
            image: 'nextcloud:30',
            volumes: [
              { type: 'bind', source: `${ROOT}/app-data/migrated/nextcloud/data` },
              { type: 'bind', source: `${ROOT}/app-data/migrated/nextcloud/data/config` },
              { type: 'bind', source: '/var/run/docker.sock' },
              { type: 'bind', source: '/' },
              { type: 'bind', source: '/mnt/media/' },
              { type: 'volume', source: 'db' },
              { type: 'volume', source: 'shared' },
              { type: 'tmpfs' },
            ],
          },
          db: { image: 'docker.io/library/postgres:14', volumes: [{ type: 'volume', source: 'db' }] },
        },
        volumes: { db: { name: 'nextcloud_migrated_db' }, shared: { name: 'my-shared-volume', external: true } },
      },
      ROOT,
    );

    expect(result).toEqual({
      binds: ['/mnt/media', `${ROOT}/app-data/migrated/nextcloud/data`],
      volumes: ['nextcloud_migrated_db', 'my-shared-volume'],
      images: ['nextcloud:30', 'postgres:14'],
    });
  });

  it('handles apps without volumes', () => {
    expect(parseComposeStorage({ services: { whoami: { image: 'traefik/whoami' } }, volumes: null }, ROOT)).toEqual(
      storage([], [], ['traefik/whoami:latest']),
    );
  });
});

describe('normalizeImage', () => {
  it('matches docker RepoTags', () => {
    expect(normalizeImage('postgres')).toBe('postgres:latest');
    expect(normalizeImage('docker.io/library/postgres:14')).toBe('postgres:14');
    expect(normalizeImage('ghcr.io/gethomepage/homepage')).toBe('ghcr.io/gethomepage/homepage:latest');
    expect(normalizeImage('localhost:5000/app')).toBe('localhost:5000/app:latest');
    expect(normalizeImage('app@sha256:abc')).toBe('app@sha256:abc');
  });
});

describe('path grouping', () => {
  it('removes nested paths', () => {
    expect(removeNestedPaths(['/a/b', '/a', '/ab', '/a/b/c'])).toEqual(['/a', '/ab']);
  });

  it('groups paths of different apps when one contains the other', () => {
    const groups = groupPaths(
      new Map([
        ['jellyfin:migrated', ['/media']],
        ['sonarr:migrated', ['/media/tv', '/data/sonarr']],
        ['nextcloud:migrated', ['/data/nextcloud']],
      ]),
    );

    expect(groups).toEqual([
      { root: '/media', apps: ['jellyfin:migrated', 'sonarr:migrated'] },
      { root: '/data/sonarr', apps: ['sonarr:migrated'] },
      { root: '/data/nextcloud', apps: ['nextcloud:migrated'] },
    ]);
  });
});

describe('attributeDisk', () => {
  it('attributes exclusive storage and reports shared storage once', () => {
    const { apps, shared } = attributeDisk({
      storage: new Map([
        ['jellyfin:migrated', storage(['/data/jellyfin', '/media'], [], ['jellyfin:10'])],
        ['sonarr:migrated', storage(['/data/sonarr', '/media/tv'], ['shared-cache'], ['sonarr:4'])],
        ['radarr:migrated', storage(['/data/radarr'], ['shared-cache', 'radarr_db'], ['postgres:14'])],
        ['immich:migrated', storage(['/mnt/unreachable'], [], ['postgres:14'])],
      ]),
      pathSizes: new Map([
        ['/data/jellyfin', 1 * GB],
        ['/media', 500 * GB],
        ['/data/sonarr', 2 * GB],
        ['/data/radarr', 3 * GB],
      ]),
      volumeSizes: new Map([
        ['shared-cache', 4 * GB],
        ['radarr_db', 5 * GB],
      ]),
      containerSizes: new Map([['jellyfin:migrated', 100]]),
      imageSizes: new Map([
        ['jellyfin:10', 10],
        ['sonarr:4', 20],
        ['postgres:14', 30],
      ]),
    });

    expect(apps.get('jellyfin:migrated')).toEqual({
      total: GB + 100 + 10,
      data: GB,
      volumes: 0,
      containers: 100,
      images: 10,
      shared: ['data:/media'],
      unmeasured: [],
    });
    expect(apps.get('sonarr:migrated')).toMatchObject({ total: 2 * GB + 20, shared: ['data:/media', 'volume:shared-cache'] });
    expect(apps.get('radarr:migrated')).toMatchObject({ total: 3 * GB + 5 * GB, shared: ['volume:shared-cache', 'image:postgres:14'] });
    expect(apps.get('immich:migrated')).toMatchObject({ total: 0, unmeasured: ['/mnt/unreachable'], shared: ['image:postgres:14'] });

    expect(shared).toEqual([
      { id: 'data:/media', kind: 'data', sources: ['/media'], size: 500 * GB, apps: ['jellyfin:migrated', 'sonarr:migrated'] },
      { id: 'volume:shared-cache', kind: 'volume', sources: ['shared-cache'], size: 4 * GB, apps: ['radarr:migrated', 'sonarr:migrated'] },
      { id: 'image:postgres:14', kind: 'image', sources: ['postgres:14'], size: 30, apps: ['immich:migrated', 'radarr:migrated'] },
    ]);
  });

  it('never counts storage more than once overall', () => {
    const { apps, shared } = attributeDisk({
      storage: new Map([
        ['a:s', storage(['/media', '/media/a'])],
        ['b:s', storage(['/media/b'])],
      ]),
      pathSizes: new Map([['/media', 10]]),
      volumeSizes: new Map(),
      containerSizes: new Map(),
      imageSizes: new Map(),
    });

    const total = [...apps.values()].reduce((sum, app) => sum + app.total, 0) + shared.reduce((sum, s) => sum + s.size, 0);
    expect(total).toBe(10);
  });
});

describe('translateHostPath', () => {
  const mounts = [
    { source: '/home/user/runtipi/app-data', destination: '/app-data' },
    { source: '/home/user/runtipi/media', destination: '/data/media' },
    { source: '/home/user/runtipi', destination: '/data' },
  ];

  it('uses the most specific mount', () => {
    expect(translateHostPath('/home/user/runtipi/app-data/migrated/x', mounts)).toBe('/app-data/migrated/x');
    expect(translateHostPath('/home/user/runtipi/media', mounts)).toBe('/data/media');
    expect(translateHostPath('/home/user/runtipi/other', mounts)).toBe('/data/other');
  });

  it('returns null for paths not visible from runtipi', () => {
    expect(translateHostPath('/mnt/nas', mounts)).toBeNull();
    expect(translateHostPath('/home/user/runtipi-other', mounts)).toBeNull();
  });

  it('keeps host paths when runtipi does not run in a container', () => {
    expect(translateHostPath('/mnt/nas', null)).toBe('/mnt/nas');
  });
});
