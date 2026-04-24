import { setTimeout } from 'node:timers/promises';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { type } from 'arktype';
import { Connection } from 'rabbitmq-client';
import { EventPublisher } from './event.publisher';
import { type ArkTypeSchema, Queue } from './queue.entity';

@Injectable()
export class QueueFactory {
  private rabbit: Connection;
  private connectionAttempts = 0;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  public constructor(
    private readonly logger: LoggerService,
    private readonly config: ConfigurationService,
  ) {
    this.initializeConnection();
  }

  public async initializeConnection() {
    // Prevent multiple simultaneous initialization attempts
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitialize();
    return this.initializationPromise;
  }

  private async doInitialize() {
    const { host, password, username } = this.config.get('queue');

    this.rabbit = new Connection({
      hostname: host,
      username,
      password,
      connectionTimeout: 30000,
      heartbeat: 60,
    });

    this.rabbit.on('connection', () => {
      this.connectionAttempts = 0;
      this.isInitialized = true;
      this.logger.info('Connected to the queue');
    });

    this.rabbit.on('error', async (error) => {
      this.logger.error('Queue connection error', error);
      this.isInitialized = false;
      this.reconnect(error);
    });

    // Wait for the connection to be ready
    await this.waitForConnection();
  }

  private async waitForConnection(maxWaitTime = 30000) {
    const startTime = Date.now();

    while (!this.rabbit.ready && Date.now() - startTime < maxWaitTime) {
      await setTimeout(1000);
    }

    if (!this.rabbit.ready) {
      throw new Error('Failed to connect to RabbitMQ within timeout period');
    }
  }

  public getConnection() {
    return this.rabbit;
  }

  public isReady() {
    return this.isInitialized && this.rabbit?.ready;
  }

  // Re-establish connection to Queue with exponential backoff
  public async reconnect(error: Error) {
    if (this.connectionAttempts > 5) {
      this.logger.error('Queue connection lost, exceeded maximum reconnection attempts');
      Sentry.captureException(error, { tags: { source: 'rabbitmq' } });

      return error;
    }

    this.connectionAttempts++;
    this.logger.warn(`Queue connection lost, attempting to reconnect... (attempt ${this.connectionAttempts}/5)`);

    const timeout = 2 ** this.connectionAttempts * 1000;
    await setTimeout(timeout);

    // Reset the initialization promise to allow re-initialization
    this.initializationPromise = null;
    this.isInitialized = false;

    await this.initializeConnection();
  }

  public async createQueue<T extends ArkTypeSchema>(params: { queueName: string; workers?: number; eventSchema: T; timeout?: number }) {
    // Ensure connection is ready before creating queue
    if (!this.isReady()) {
      this.logger.warn('Queue connection not ready, waiting for initialization...');
      await this.initializeConnection();
    }

    const publisher = new EventPublisher(this.rabbit, this.logger, params.queueName);
    const resultSchema = type({ success: 'boolean', message: 'string' });
    publisher.initialize();

    const { queueName, workers = 3, eventSchema, timeout } = params;

    const rpcClient = this.rabbit.createRPCClient({
      timeout,
      confirm: true,
      maxAttempts: 3,
      queues: [{ autoDelete: false, durable: true, queue: queueName }],
    });

    return new Queue(this.rabbit, rpcClient, publisher, queueName, workers, eventSchema, resultSchema, this.logger);
  }
}
