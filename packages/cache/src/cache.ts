import type { ILogger } from '@runtipi/shared/node';
import IORedis from 'ioredis';

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

type IConfig = {
  host: string;
  port: number;
  password: string;
};

export interface ICache {
  set(key: string, value: string, expiration?: number): Promise<string | null>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  getByPrefix(prefix: string): Promise<Array<{ key: string; val: string | null }>>;
  close(): Promise<string>;
  ttl(key: string): Promise<number>;
  clear(): Promise<number[]>;
  getClient(): Promise<IORedis>;
}

export class Cache implements ICache {
  private client: IORedis;

  constructor(
    config: IConfig,
    private logger: ILogger,
  ) {
    const { host, port, password } = config;
    this.client = new IORedis({ host, port, password, maxRetriesPerRequest: null });

    this.client.on('error', (error) => {
      this.logger.error('cache error', error);
    });

    this.client.on('connect', () => {
      this.logger.debug('connected to cache');
    });
  }

  public async getClient() {
    if (this.client.status === 'close') {
      await this.client.connect();
    }
    return this.client;
  }

  public async set(key: string, value: string, expiration = ONE_DAY_IN_SECONDS) {
    const client = await this.getClient();
    return client.set(key, value, 'EX', expiration);
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
    this.logger.info('Closing cache connection');
    return this.client.quit();
  }

  public async ttl(key: string) {
    const client = await this.getClient();
    return client.ttl(key);
  }

  public async clear() {
    const client = await this.getClient();
    try {
      const keys = await client.keys('*');
      return Promise.all(keys.map((key) => client.del(key)));
    } catch (error) {
      this.logger.error('Failed to clear cache', error);
      throw error;
    }
  }
}
