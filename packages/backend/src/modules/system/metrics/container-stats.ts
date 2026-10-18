import type { ContainerStats } from 'dockerode';

export type ContainerSample = {
  /** Time at which docker read the stats (ms since epoch) */
  readAt: number;
  /** Total CPU time consumed by the container (nanoseconds) */
  cpuUsageNs: number;
  /** Memory used, without inactive page cache (bytes) */
  memoryUsed: number;
  rxBytes: number;
  txBytes: number;
};

export type ContainerRates = {
  /** CPU usage in percent of all CPUs available to runtipi */
  cpu: number;
  rxBytesPerSec: number;
  txBytesPerSec: number;
};

/**
 * Convert a docker stats payload to the values we keep between samples.
 */
export const toContainerSample = (stats: ContainerStats, now = Date.now()): ContainerSample => {
  const memoryStats = stats.memory_stats ?? {};
  const memStat = (memoryStats.stats ?? {}) as Record<string, number | undefined>;
  // Same formula as `docker stats`: cgroup v2 exposes inactive_file, cgroup v1 total_inactive_file
  const inactiveFile = memStat.inactive_file ?? memStat.total_inactive_file ?? 0;
  const memoryUsed = Math.max((memoryStats.usage ?? 0) - inactiveFile, 0);

  let rxBytes = 0;
  let txBytes = 0;
  for (const network of Object.values(stats.networks ?? {})) {
    rxBytes += network.rx_bytes ?? 0;
    txBytes += network.tx_bytes ?? 0;
  }

  const readAt = Date.parse(stats.read);

  return {
    readAt: Number.isNaN(readAt) || readAt <= 0 ? now : readAt,
    cpuUsageNs: stats.cpu_stats?.cpu_usage?.total_usage ?? 0,
    memoryUsed,
    rxBytes,
    txBytes,
  };
};

/**
 * Compute rates between two samples of the same container.
 * CPU is expressed in percent of the `cpus` available, so per-app values add up to the system CPU load.
 */
export const computeContainerRates = (prev: ContainerSample, next: ContainerSample, cpus: number): ContainerRates | null => {
  const elapsedMs = next.readAt - prev.readAt;
  if (elapsedMs <= 0 || cpus <= 0) return null;

  // Counters reset when a container restarts, don't report a negative rate
  const cpuDelta = Math.max(next.cpuUsageNs - prev.cpuUsageNs, 0);
  const rxDelta = Math.max(next.rxBytes - prev.rxBytes, 0);
  const txDelta = Math.max(next.txBytes - prev.txBytes, 0);

  return {
    cpu: Math.min((cpuDelta / (elapsedMs * 1e6 * cpus)) * 100, 100),
    rxBytesPerSec: (rxDelta / elapsedMs) * 1000,
    txBytesPerSec: (txDelta / elapsedMs) * 1000,
  };
};
