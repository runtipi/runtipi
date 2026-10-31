import path from 'node:path';

type ReadFile = (filePath: string) => Promise<string | null>;
type MemoryStat = Readonly<Record<string, number | undefined>>;

export type CgroupMemory = {
  used: number;
  limit: number | null;
};

const parseNumber = (content: string | null): number | null => {
  if (!content?.trim()) return null;

  const value = Number(content.trim());

  return Number.isSafeInteger(value) && value >= 0 ? value : null;
};

const parseStat = (content: string): MemoryStat => {
  const stat: Record<string, number> = {};

  for (const line of content.split('\n')) {
    const [key, value] = line.trim().split(/\s+/);
    const parsed = parseNumber(value ?? null);

    if (key && parsed !== null) {
      stat[key] = parsed;
    }
  }

  return stat;
};

export const getUsedCgroupMemory = (usage: number, stat: MemoryStat): number => {
  const inactiveFile = stat.total_inactive_file ?? stat.inactive_file ?? 0;
  const activeFile = stat.total_active_file ?? stat.active_file ?? 0;
  const reclaimableSlab = stat.slab_reclaimable ?? 0;

  // Match lxcfs MemAvailable, including reclaimable active file cache and slab.
  return Math.max(usage - inactiveFile - activeFile - reclaimableSlab, 0);
};

export const readCgroupMemory = async (root: string, readFile: ReadFile): Promise<CgroupMemory | null> => {
  const [current, stat, max] = await Promise.all([
    readFile(path.join(root, 'memory.current')),
    readFile(path.join(root, 'memory.stat')),
    readFile(path.join(root, 'memory.max')),
  ]);
  const usage = parseNumber(current);

  if (usage !== null && stat !== null) {
    return { used: getUsedCgroupMemory(usage, parseStat(stat)), limit: parseNumber(max) };
  }

  const [v1Current, v1Stat, v1Max] = await Promise.all([
    readFile(path.join(root, 'memory/memory.usage_in_bytes')),
    readFile(path.join(root, 'memory/memory.stat')),
    readFile(path.join(root, 'memory/memory.limit_in_bytes')),
  ]);
  const v1Usage = parseNumber(v1Current);

  if (v1Usage === null || v1Stat === null) return null;

  const memoryStat = parseStat(v1Stat);
  const limits = [parseNumber(v1Max), memoryStat.hierarchical_memory_limit].filter((limit): limit is number => typeof limit === 'number');
  const limit = limits.length > 0 ? Math.min(...limits) : null;

  return { used: getUsedCgroupMemory(v1Usage, memoryStat), limit };
};

export const isServedByLxcfs = (mountinfo: string | null, mountPoint: string) => {
  return (mountinfo ?? '').split('\n').some((line) => {
    const [before, after] = line.split(' - ');
    const mountedPath = before?.split(' ')[4];
    const fsType = after?.split(' ')[0];

    return mountedPath === mountPoint && fsType === 'fuse.lxcfs';
  });
};
