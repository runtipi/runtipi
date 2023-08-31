import { createClient, RedisClientType } from 'redis';
import { Logger } from '../Logger';
import { getConfig } from '../TipiConfig';

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

export class TipiCache {
  private static instance: TipiCache;

  private client: RedisClientType;

  constructor() {
    const client = createClient({
      url: `redis://${getConfig().REDIS_HOST}:6379`,
      password: getConfig().redisPassword,
    });

    client.on('error', (err) => {
      Logger.error(`Redis error: ${err}`);
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
    return this.client.quit();
  }

  public async ttl(key: string) {
    const client = await this.getClient();
    return client.ttl(key);
  }
}
