import { expect, test } from 'vitest';
import { getUsedCgroupMemory, isServedByLxcfs, readCgroupMemory } from '../metrics/cgroup';
import { getUsedMemory, parseMeminfo } from '../metrics/meminfo';

const GB = 1024 ** 3;
const readMemory = (files: Record<string, string>) => readCgroupMemory('/cg', async (file) => files[file] ?? null);

test('uses MemAvailable without rounding bytes to GB', () => {
  const memory = parseMeminfo('MemTotal: 8388608 kB\nMemAvailable: 8126464 kB\n');

  expect(memory.total).toBe(8 * GB);
  expect(getUsedMemory(memory)).toBe(GB / 4);
});

test('subtracts reclaimable memory when MemAvailable is absent', () => {
  const memory = parseMeminfo(
    'MemTotal: 8388608 kB\nMemFree: 4194304 kB\nBuffers: 524288 kB\nCached: 1048576 kB\nSReclaimable: 524288 kB\nShmem: 262144 kB\n',
  );

  expect(getUsedMemory(memory)).toBe(2.25 * GB);
});

test.each([
  { inactive_file: GB, active_file: 3 * GB, slab_reclaimable: GB },
  { total_inactive_file: GB, total_active_file: 3 * GB, slab_reclaimable: GB },
])('subtracts the same reclaimable categories as lxcfs with %j', (stat) => {
  expect(getUsedCgroupMemory(6 * GB, stat)).toBe(GB);
});

test('reads v2 cgroup usage and limit', async () => {
  expect(
    await readMemory({
      '/cg/memory.current': `${6 * GB}`,
      '/cg/memory.stat': `inactive_file ${GB}\nactive_file ${3 * GB}\nslab_reclaimable ${GB}`,
      '/cg/memory.max': `${8 * GB}`,
    }),
  ).toEqual({ used: GB, limit: 8 * GB });
});

test('recognizes an unlimited v2 cgroup', async () => {
  expect(await readMemory({ '/cg/memory.current': '100', '/cg/memory.stat': 'inactive_file 0', '/cg/memory.max': 'max' })).toEqual({
    used: 100,
    limit: null,
  });
});

test('reads v1 hierarchy usage and its effective limit', async () => {
  expect(
    await readMemory({
      '/cg/memory/memory.usage_in_bytes': `${6 * GB}`,
      '/cg/memory/memory.stat': `total_inactive_file ${GB}\ntotal_active_file ${3 * GB}\nhierarchical_memory_limit ${8 * GB}`,
      '/cg/memory/memory.limit_in_bytes': '9223372036854771712',
    }),
  ).toEqual({ used: 2 * GB, limit: 8 * GB });
});

test.each(['', '-1', 'not-a-number'])('rejects invalid cgroup usage %j', async (usage) => {
  expect(await readMemory({ '/cg/memory.current': usage, '/cg/memory.stat': 'inactive_file 0' })).toBeNull();
});

test('requires memory.stat to calculate reclaimable usage', async () => {
  expect(await readMemory({ '/cg/memory.current': '100' })).toBeNull();
});

test('returns null for the root cgroup without memory accounting', async () => {
  expect(await readMemory({ '/cg/cpu.stat': 'usage_usec 1' })).toBeNull();
});

test('does not report negative usage when accounting changes between reads', () => {
  expect(getUsedCgroupMemory(100, { inactive_file: 200 })).toBe(0);
});

test('detects the lxcfs meminfo mount', () => {
  expect(isServedByLxcfs('1010 1000 0:60 /proc/meminfo /host/proc/meminfo ro,relatime - fuse.lxcfs lxcfs rw', '/host/proc/meminfo')).toBe(true);
  expect(isServedByLxcfs('1010 1000 0:5 /meminfo /host/proc/meminfo ro - proc proc rw', '/host/proc/meminfo')).toBe(false);
  expect(isServedByLxcfs(null, '/host/proc/meminfo')).toBe(false);
});

test('recognizes the v1 unlimited sentinel without a finite hierarchy limit', async () => {
  expect(
    await readMemory({
      '/cg/memory/memory.usage_in_bytes': '100',
      '/cg/memory/memory.stat': 'total_inactive_file 0',
      '/cg/memory/memory.limit_in_bytes': '9223372036854771712',
    }),
  ).toEqual({ used: 100, limit: null });
});
