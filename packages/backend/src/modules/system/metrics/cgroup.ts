import path from 'node:path';

type ReadFile = (filePath: string) => Promise<string | null>;

export type CgroupMemory = {
  /** Memory used by the cgroup, without inactive page cache (bytes) */
  used: number;
  /** Memory limit of the cgroup, null when unlimited (bytes) */
  limit: number | null;
};

const parseStatFile = (content: string): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const line of content.split('\n')) {
    const [key, value] = line.trim().split(/\s+/);
    if (key && value !== undefined && !Number.isNaN(Number(value))) {
      result[key] = Number(value);
    }
  }
  return result;
};

const parseNumber = (content: string | null): number | null => {
  if (content === null) return null;
  const value = Number(content.trim());
  return Number.isFinite(value) ? value : null;
};

// cgroup v1 reports "no limit" as a huge page-aligned number instead of "max"
const V1_UNLIMITED_THRESHOLD = 2 ** 60;

/**
 * Reads memory accounting of the cgroup mounted at `root`.
 *
 * Inside an LXC container, `/sys/fs/cgroup` is the container's own cgroup, so mounting it into
 * runtipi gives the real usage of the whole LXC container, which /proc/meminfo (served by lxcfs)
 * can not provide when read from a nested Docker container.
 */
export class CgroupReader {
  constructor(
    private readonly root: string,
    private readonly readFile: ReadFile,
  ) {}

  private read(file: string) {
    return this.readFile(path.join(this.root, file));
  }

  /**
   * Returns the cgroup memory usage, or null if the mounted cgroup has no memory accounting.
   */
  async getMemory(): Promise<CgroupMemory | null> {
    // cgroup v2
    const current = parseNumber(await this.read('memory.current'));
    if (current !== null) {
      const stat = parseStatFile((await this.read('memory.stat')) ?? '');
      const max = (await this.read('memory.max'))?.trim();
      const limit = max && max !== 'max' ? parseNumber(max) : null;

      return { used: Math.max(current - (stat.inactive_file ?? 0), 0), limit };
    }

    // cgroup v1
    const usage = parseNumber(await this.read('memory/memory.usage_in_bytes'));
    if (usage !== null) {
      const stat = parseStatFile((await this.read('memory/memory.stat')) ?? '');
      const rawLimit = parseNumber(await this.read('memory/memory.limit_in_bytes'));
      const limit = rawLimit !== null && rawLimit < V1_UNLIMITED_THRESHOLD ? rawLimit : null;

      return { used: Math.max(usage - (stat.total_inactive_file ?? 0), 0), limit };
    }

    return null;
  }
}

/**
 * Detects if a path inside this container is served by lxcfs (i.e. runtipi runs inside LXC).
 * lxcfs computes /proc/meminfo from the cgroup of the *reading* process, so from within a Docker
 * container it only reports the memory used by that container instead of the whole LXC.
 */
export const isServedByLxcfs = (mountinfo: string | null, mountPoint: string) => {
  if (!mountinfo) return false;

  return mountinfo.split('\n').some((line) => {
    const [before, after] = line.split(' - ');
    const fields = before?.split(' ') ?? [];
    const fsType = after?.split(' ')[0] ?? '';
    return fields[4] === mountPoint && fsType.includes('lxcfs');
  });
};
