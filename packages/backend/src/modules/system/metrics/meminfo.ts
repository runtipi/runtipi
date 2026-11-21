export type Meminfo = {
  total: number;
  free: number;
  available: number | null;
  buffers: number;
  cached: number;
  sReclaimable: number;
  shmem: number;
};

const readKb = (content: string, key: string): number | null => {
  const match = content.match(new RegExp(`^${key}:\\s+(\\d+)`, 'm'));

  return match?.[1] ? Number(match[1]) * 1024 : null;
};

export const parseMeminfo = (content: string): Meminfo => {
  return {
    total: readKb(content, 'MemTotal') ?? 0,
    free: readKb(content, 'MemFree') ?? 0,
    available: readKb(content, 'MemAvailable'),
    buffers: readKb(content, 'Buffers') ?? 0,
    cached: readKb(content, 'Cached') ?? 0,
    sReclaimable: readKb(content, 'SReclaimable') ?? 0,
    shmem: readKb(content, 'Shmem') ?? 0,
  };
};

export const getUsedMemory = (meminfo: Meminfo): number => {
  if (meminfo.total <= 0) return 0;

  if (meminfo.available !== null) {
    return clamp(meminfo.total - meminfo.available, 0, meminfo.total);
  }

  const used = meminfo.total - meminfo.free - meminfo.buffers - meminfo.cached - meminfo.sReclaimable + meminfo.shmem;

  return clamp(used, 0, meminfo.total);
};

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
