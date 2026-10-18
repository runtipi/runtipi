import { describe, expect, it } from 'vitest';
import { computeContainerRates, toContainerSample } from '../metrics/container-stats';
import { getUsedMemory, parseMeminfo } from '../metrics/meminfo';
import { RingBuffer } from '../metrics/ring-buffer';
import type { ContainerStats } from 'dockerode';

const GB = 1024 ** 3;

const meminfo = (lines: Record<string, number>) =>
  Object.entries(lines)
    .map(([key, kb]) => `${key}:     ${kb} kB`)
    .join('\n');

describe('meminfo', () => {
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

  it('returns 0 for empty content', () => {
    expect(getUsedMemory(parseMeminfo(''))).toBe(0);
  });
});

describe('container stats', () => {
  const stats = (read: string, cpuNs: number, rx: number, usage = 300, inactive = 100) =>
    ({
      read,
      cpu_stats: { cpu_usage: { total_usage: cpuNs } },
      memory_stats: { usage, stats: { inactive_file: inactive } },
      networks: { eth0: { rx_bytes: rx, tx_bytes: rx / 2 } },
    }) as unknown as ContainerStats;

  it('computes memory like docker stats', () => {
    expect(toContainerSample(stats('2024-01-01T00:00:00Z', 0, 0)).memoryUsed).toBe(200);
  });

  it('computes cpu and network rates between samples', () => {
    const prev = toContainerSample(stats('2024-01-01T00:00:00Z', 0, 0));
    const next = toContainerSample(stats('2024-01-01T00:00:10Z', 10e9, 10_000));

    // 10s of CPU time over 10s on a 4 CPUs machine = 25%
    expect(computeContainerRates(prev, next, 4)).toEqual({ cpu: 25, rxBytesPerSec: 1000, txBytesPerSec: 500 });
  });

  it('does not report negative rates after a restart', () => {
    const prev = toContainerSample(stats('2024-01-01T00:00:00Z', 10e9, 10_000));
    const next = toContainerSample(stats('2024-01-01T00:00:10Z', 1e9, 100));

    expect(computeContainerRates(prev, next, 4)).toEqual({ cpu: 0, rxBytesPerSec: 0, txBytesPerSec: 0 });
  });
});

describe('RingBuffer', () => {
  it('keeps the most recent items', () => {
    const buffer = new RingBuffer<number>(3);
    for (const n of [1, 2, 3, 4, 5]) buffer.push(n);

    expect(buffer.toArray()).toEqual([3, 4, 5]);
    expect(buffer.last()).toBe(5);
  });
});
