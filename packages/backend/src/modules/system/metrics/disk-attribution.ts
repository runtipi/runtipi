import path from 'node:path';

/**
 * Storage referenced by an app, extracted from its resolved compose config.
 * Paths are absolute paths on the docker host.
 */
export type AppStorage = {
  binds: string[];
  volumes: string[];
  images: string[];
};

export type AppDiskBreakdown = {
  /** Disk used only by this app (data + volumes + containers + images) */
  total: number;
  data: number;
  volumes: number;
  containers: number;
  images: number;
  /** Ids of the shared storage groups this app also uses */
  shared: string[];
  /** Host paths that could not be measured (not visible from runtipi) */
  unmeasured: string[];
};

export type SharedStorage = {
  id: string;
  kind: 'data' | 'volume' | 'image';
  /** Paths, volume names or image tags */
  sources: string[];
  size: number;
  apps: string[];
};

// Host paths that are never app data
const SYSTEM_PATHS = ['/proc', '/sys', '/dev', '/run', '/var/run', '/etc', '/boot', '/lib', '/lib64', '/usr', '/bin', '/sbin', '/var/lib/docker'];

/**
 * Normalize a path and remove its trailing slash, so "/media/" and "/media" are the same path.
 */
export const normalizePath = (p: string) => {
  const normalized = path.posix.normalize(p);
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
};

const isSameOrInside = (child: string, parent: string) => child === parent || child.startsWith(parent === '/' ? '/' : `${parent}/`);

/**
 * Whether a bind mount source should be counted as app data.
 * Excludes system paths and parents of the runtipi folder (e.g. an app mounting "/" or "/home" read-only
 * to monitor the host), which would otherwise count the whole disk.
 */
export const isAppDataPath = (hostPath: string, rootFolderHost: string) => {
  const normalized = normalizePath(hostPath);
  if (!path.posix.isAbsolute(normalized) || normalized === '/') return false;
  if (SYSTEM_PATHS.some((systemPath) => isSameOrInside(normalized, systemPath))) return false;
  if (rootFolderHost && isSameOrInside(normalizePath(rootFolderHost), normalized)) return false;
  return true;
};

type ComposeConfig = {
  services?: Record<string, { image?: string; volumes?: { type?: string; source?: string }[] }>;
  volumes?: Record<string, { name?: string; external?: boolean } | null> | null;
};

/**
 * Extract the storage an app uses from `docker compose config --format json`. Using the resolved config
 * means user compose overrides and environment variables are taken into account.
 */
export const parseComposeStorage = (config: ComposeConfig, rootFolderHost: string): AppStorage => {
  const binds = new Set<string>();
  const volumes = new Set<string>();
  const images = new Set<string>();

  for (const service of Object.values(config.services ?? {})) {
    if (service.image) images.add(normalizeImage(service.image));

    for (const volume of service.volumes ?? []) {
      if (!volume.source) continue;

      if (volume.type === 'bind' && isAppDataPath(volume.source, rootFolderHost)) {
        binds.add(normalizePath(volume.source));
      } else if (volume.type === 'volume') {
        // The real volume name is prefixed with the project name unless set explicitly
        volumes.add(config.volumes?.[volume.source]?.name ?? volume.source);
      }
    }
  }

  return { binds: removeNestedPaths([...binds]), volumes: [...volumes], images: [...images] };
};

/**
 * Normalize an image reference so it matches the RepoTags reported by docker.
 */
export const normalizeImage = (image: string) => {
  let name = image.replace(/^docker\.io\//, '').replace(/^library\//, '');
  const lastSegment = name.split('/').pop() ?? '';
  if (!lastSegment.includes(':') && !name.includes('@')) name = `${name}:latest`;
  return name;
};

/**
 * Keep only the top-most paths, so nested mounts of the same tree are not counted twice.
 */
export const removeNestedPaths = (paths: string[]) => {
  const sorted = [...new Set(paths)].sort((a, b) => a.length - b.length);
  const result: string[] = [];
  for (const candidate of sorted) {
    if (!result.some((parent) => isSameOrInside(candidate, parent))) result.push(candidate);
  }
  return result;
};

/**
 * Group paths of all apps into trees: two paths belong to the same group when one contains the other.
 * A group used by a single app is that app's data, a group used by several apps is shared.
 */
export const groupPaths = (appPaths: Map<string, string[]>) => {
  const roots = removeNestedPaths([...appPaths.values()].flat());

  return roots.map((root) => {
    const apps = [...appPaths.entries()].filter(([, paths]) => paths.some((p) => isSameOrInside(p, root))).map(([urn]) => urn);
    return { root, apps: apps.sort() };
  });
};

type AttributionInput = {
  storage: Map<string, AppStorage>;
  /** Size of each measured host path, missing when it could not be measured */
  pathSizes: Map<string, number>;
  volumeSizes: Map<string, number>;
  /** Writable layer size of each app's containers */
  containerSizes: Map<string, number>;
  /** Size of each image not shared with other images, by normalized tag */
  imageSizes: Map<string, number>;
};

/**
 * Attribute disk usage to apps without counting anything twice.
 */
export const attributeDisk = ({ storage, pathSizes, volumeSizes, containerSizes, imageSizes }: AttributionInput) => {
  const breakdowns = new Map<string, AppDiskBreakdown>();
  const shared: SharedStorage[] = [];

  for (const urn of storage.keys()) {
    breakdowns.set(urn, { total: 0, data: 0, volumes: 0, containers: containerSizes.get(urn) ?? 0, images: 0, shared: [], unmeasured: [] });
  }

  const addShared = (kind: SharedStorage['kind'], source: string, size: number, apps: string[]) => {
    const id = `${kind}:${source}`;
    shared.push({ id, kind, sources: [source], size, apps });
    for (const urn of apps) breakdowns.get(urn)?.shared.push(id);
  };

  // Bind mounts
  const groups = groupPaths(new Map([...storage.entries()].map(([urn, s]) => [urn, s.binds])));
  for (const { root, apps } of groups) {
    const size = pathSizes.get(root);
    if (size === undefined) {
      for (const urn of apps) breakdowns.get(urn)?.unmeasured.push(root);
      continue;
    }

    const [owner] = apps;
    if (apps.length === 1 && owner) {
      const breakdown = breakdowns.get(owner);
      if (breakdown) breakdown.data += size;
    } else {
      addShared('data', root, size, apps);
    }
  }

  // Named volumes and images, shared when referenced by several apps
  const attributeByReference = (kind: 'volume' | 'image', getRefs: (s: AppStorage) => string[], sizes: Map<string, number>) => {
    const users = new Map<string, string[]>();
    for (const [urn, s] of storage) {
      for (const ref of getRefs(s)) users.set(ref, [...(users.get(ref) ?? []), urn]);
    }

    for (const [ref, apps] of users) {
      const size = sizes.get(ref);
      if (size === undefined) continue;

      const [owner] = apps;
      if (apps.length === 1 && owner) {
        const breakdown = breakdowns.get(owner);
        if (breakdown) breakdown[kind === 'volume' ? 'volumes' : 'images'] += size;
      } else {
        addShared(kind, ref, size, apps.sort());
      }
    }
  };

  attributeByReference('volume', (s) => s.volumes, volumeSizes);
  attributeByReference('image', (s) => s.images, imageSizes);

  for (const breakdown of breakdowns.values()) {
    breakdown.total = breakdown.data + breakdown.volumes + breakdown.containers + breakdown.images;
  }

  return { apps: breakdowns, shared };
};

export type Mount = { source: string; destination: string };

/**
 * Translate a path on the docker host to the path where runtipi can read it, using runtipi's own mounts.
 * Returns null when the path is not mounted into the runtipi container.
 * When runtipi does not run in a container (`mounts` is null) host paths are used as is.
 */
export const translateHostPath = (hostPath: string, mounts: Mount[] | null): string | null => {
  if (mounts === null) return hostPath;

  let best: Mount | null = null;
  for (const mount of mounts) {
    if (isSameOrInside(hostPath, mount.source) && (!best || mount.source.length > best.source.length)) {
      best = mount;
    }
  }

  if (!best) return null;
  return path.posix.join(best.destination, path.posix.relative(best.source, hostPath));
};
