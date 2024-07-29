import { createClient, RedisClientType } from 'redis';
import { TipiConfig } from '../TipiConfig';
import { inject, injectable } from 'inversify';
import { ILogger } from '@runtipi/shared/node';

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

export interface ITipiCache {
  set(key: string, value: string, expiration?: number): Promise<string | null>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  getByPrefix(prefix: string): Promise<Array<{ key: string; val: string | null }>>;
  close(): Promise<string>;
  ttl(key: string): Promise<number>;
}

@injectable()
export class TipiCache {
  private client: RedisClientType;

  constructor(@inject('ILogger') private logger: ILogger) {
    const client = createClient({
      url: `redis://${TipiConfig.getConfig().REDIS_HOST}:6379`,
      password: TipiConfig.getConfig().redisPassword,
    });

    this.client = client as RedisClientType;

    this.client.on('error', (error) => {
      this.logger.error('cache error', error);
    });
  }

  private async getClient(): Promise<RedisClientType> {
    if (!this.client.isOpen) {
      await this.client.connect();
      this.logger.info('connected to cache');
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
    this.logger.info('Closing cache connection');
    return this.client.quit();
  }

  public async ttl(key: string) {
    const client = await this.getClient();
    return client.ttl(key);
  }
}
