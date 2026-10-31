import { pLimit } from '@/common/helpers/file-helpers';
import type Dockerode from 'dockerode';
import { getUsedCgroupMemory } from './cgroup';

const CACHE_MS = 10_000;

export class ContainerMemoryReader {
  private cache: { used: number; at: number } | null = null;
  private pending: Promise<number> | null = null;

  constructor(private readonly docker: Dockerode) {}

  getMemory(): Promise<number> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) {
      return Promise.resolve(this.cache.used);
    }

    if (this.pending) return this.pending;

    this.pending = this.readMemory()
      .then((used) => {
        this.cache = { used, at: Date.now() };
        return used;
      })
      .catch((error) => {
        if (this.cache) return this.cache.used;

        throw error;
      })
      .finally(() => {
        this.pending = null;
      });

    return this.pending;
  }

  private async readMemory(): Promise<number> {
    const containers = await this.docker.listContainers({ filters: { status: ['running'] } });
    const limit = pLimit(5);

    const memories = await Promise.all(
      containers.map((container) =>
        limit(async () => {
          try {
            const { memory_stats: memory } = await this.docker.getContainer(container.Id).stats({ stream: false, 'one-shot': true });

            if (!Number.isFinite(memory?.usage) || memory.usage < 0 || !memory.stats) {
              throw new Error(`Missing memory accounting for container ${container.Id}`);
            }

            return getUsedCgroupMemory(memory.usage, memory.stats);
          } catch (error) {
            if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) return 0;

            throw error;
          }
        }),
      ),
    );

    return memories.reduce((total, memory) => total + memory, 0);
  }
}
