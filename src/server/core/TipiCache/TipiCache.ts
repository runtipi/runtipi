import { createClient, RedisClientType } from 'redis';
import { Logger } from '../Logger';
import { getConfig } from '../TipiConfig';

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

export class TipiCache {
  private client: RedisClientType;

  private timeout: NodeJS.Timeout;

  constructor(reference: string) {
    const client = createClient({
      url: `redis://${getConfig().REDIS_HOST}:6379`,
      password: getConfig().redisPassword,
    });

    this.client = client as RedisClientType;

    this.timeout = setTimeout(() => {
      Logger.debug(`Redis connection is running for more than 30 seconds. Consider closing it. reference: ${reference}`);
    }, 30000);
  }

  private async getClient(): Promise<RedisClientType> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
    return this.client;
  }

  public async set(key: string, value: string, expiration = ONE_DAY_IN_SECONDS) {
    const client = await this.getClient();
    return client.set(key, value, {
      EX: expiration,
    });
  }

  public async get(key: string) {
    const client = await this.getClient();
    return client.get(key);
  }

  public async del(key: string) {
    const client = await this.getClient();
    return client.del(key);
  }

  public async getByPrefix(prefix: string) {
    const client = await this.getClient();
    const keys = await client.keys(`${prefix}*`);

    const promises = keys.map(async (key) => {
      const val = await client.get(key);
      return {
        key,
        val,
      };
    });

    return Promise.all(promises);
  }

  public async close() {
    clearTimeout(this.timeout);
    return this.client.quit();
  }

  public async ttl(key: string) {
    const client = await this.getClient();
    return client.ttl(key);
  }
}
