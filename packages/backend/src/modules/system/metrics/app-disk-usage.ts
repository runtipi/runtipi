import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pLimit } from '@/common/helpers/file-helpers';
import {
  type AppDiskBreakdown,
  type AppStorage,
  attributeDisk,
  groupPaths,
  type Mount,
  normalizeImage,
  type SharedStorage,
  translateHostPath,
} from './disk-attribution';

const execFileAsync = promisify(execFile);

const DU_TIMEOUT_MS = 10 * 60 * 1000;

const parseDuOutput = (stdout: string) => {
  const kb = Number(stdout.trim().split(/\s+/)[0]);
  return stdout.trim() && Number.isFinite(kb) ? kb * 1024 : null;
};

const runDu = async (command: string, args: string[]) => {
  try {
    const { stdout } = await execFileAsync(command, args, { timeout: DU_TIMEOUT_MS });
    return parseDuOutput(stdout);
  } catch (e) {
    const error = e as NodeJS.ErrnoException & { stdout?: string };
    if (error.code === 'ENOENT' && command === 'nice') throw error;
    // du exits with an error when some files are unreadable but still prints a total
    return parseDuOutput(error.stdout ?? '');
  }
};

/**
 * Size of a directory (or file) in bytes. `du` is much faster than walking the tree in node and is
 * available in both busybox and GNU coreutils. It runs with the lowest priority to not slow down apps.
 */
export const measureDirectory = async (directory: string): Promise<number | null> => {
  try {
    return await runDu('nice', ['-n', '19', 'du', '-sk', directory]);
  } catch {
    return runDu('du', ['-sk', directory]);
  }
};

export type DockerDiskUsage = {
  Volumes?: { Name: string; UsageData?: { Size: number } | null }[] | null;
  Containers?: { SizeRw?: number; Labels?: Record<string, string> }[] | null;
  Images?: { Size: number; SharedSize: number; RepoTags?: string[] | null }[] | null;
};

export type AppDiskUsageDeps = {
  /** Urns of all installed apps */
  listApps: () => Promise<string[]>;
  /** Storage referenced by the app's resolved compose config, null if it could not be read */
  getAppStorage: (urn: string) => Promise<AppStorage | null>;
  getDockerDiskUsage: () => Promise<DockerDiskUsage | null>;
  /** Mounts of the runtipi container, null when runtipi does not run in a container */
  getOwnMounts: () => Promise<Mount[] | null>;
  measure: (path: string) => Promise<number | null>;
};

export type AppDiskUsageResult = {
  apps: Map<string, AppDiskBreakdown>;
  shared: SharedStorage[];
  measuredAt: number;
};

/**
 * Computes how much disk each app uses: bind mounted data, named volumes, container layers and images.
 * Storage used by several apps (for example a media folder mounted by multiple apps through user compose
 * overrides) is reported once as shared instead of being counted for each app.
 */
export class AppDiskUsage {
  private result: AppDiskUsageResult | null = null;
  private running: Promise<void> | null = null;

  constructor(private readonly deps: AppDiskUsageDeps) {}

  get() {
    return this.result;
  }

  refresh(): Promise<void> {
    if (!this.running) {
      this.running = this.compute().finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  private async compute() {
    const urns = await this.deps.listApps();

    const storage = new Map<string, AppStorage>();
    const limit = pLimit(4);
    await Promise.all(
      urns.map((urn) =>
        limit(async () => {
          const appStorage = await this.deps.getAppStorage(urn);
          if (appStorage) storage.set(urn, appStorage);
        }),
      ),
    );

    const [df, mounts] = await Promise.all([this.deps.getDockerDiskUsage(), this.deps.getOwnMounts()]);

    // Measure each directory tree once, even when several apps mount it. Large directories are IO heavy,
    // so keep the concurrency low
    const pathSizes = new Map<string, number>();
    const groups = groupPaths(new Map([...storage.entries()].map(([urn, s]) => [urn, s.binds])));
    const measureLimit = pLimit(2);
    await Promise.all(
      groups.map(({ root }) =>
        measureLimit(async () => {
          const localPath = translateHostPath(root, mounts);
          if (!localPath) return;

          const size = await this.deps.measure(localPath);
          if (size !== null) pathSizes.set(root, size);
        }),
      ),
    );

    const { volumeSizes, containerSizes, imageSizes } = parseDockerDiskUsage(df);
    const { apps, shared } = attributeDisk({ storage, pathSizes, volumeSizes, containerSizes, imageSizes });

    this.result = { apps, shared, measuredAt: Date.now() };
  }
}

export const parseDockerDiskUsage = (df: DockerDiskUsage | null) => {
  const volumeSizes = new Map<string, number>();
  const containerSizes = new Map<string, number>();
  const imageSizes = new Map<string, number>();

  for (const volume of df?.Volumes ?? []) {
    const size = volume.UsageData?.Size ?? -1;
    if (size >= 0) volumeSizes.set(volume.Name, size);
  }

  for (const container of df?.Containers ?? []) {
    const urn = container.Labels?.['runtipi.appurn'];
    if (urn && container.SizeRw && container.SizeRw > 0) {
      containerSizes.set(urn, (containerSizes.get(urn) ?? 0) + container.SizeRw);
    }
  }

  for (const image of df?.Images ?? []) {
    // Only count the layers this image does not share with other images
    const unique = image.SharedSize >= 0 ? image.Size - image.SharedSize : image.Size;
    for (const tag of image.RepoTags ?? []) {
      if (tag !== '<none>:<none>') imageSizes.set(normalizeImage(tag), Math.max(unique, 0));
    }
  }

  return { volumeSizes, containerSizes, imageSizes };
};
