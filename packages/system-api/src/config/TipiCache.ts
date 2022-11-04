import { createClient, RedisClientType } from 'redis';
import { getConfig } from '../core/config/TipiConfig';

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

class TipiCache {
  private static instance: TipiCache;

  private client: RedisClientType;

  constructor() {
    const client = createClient({
      url: `redis://${getConfig().REDIS_HOST}:6379`,
    });

    this.client = client as RedisClientType;
  }

  public static getInstance(): TipiCache {
    if (!TipiCache.instance) {
      TipiCache.instance = new TipiCache();
    }

    return TipiCache.instance;
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

  public async close() {
    return this.client.quit();
  }

  public async ttl(key: string) {
    const client = await this.getClient();
    return client.ttl(key);
  }
}

export default TipiCache.getInstance();
