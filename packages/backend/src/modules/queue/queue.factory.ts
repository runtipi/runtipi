import { setTimeout } from 'node:timers/promises';
import { ConfigurationService } from '@/core/config/configuration.service.js';
import { LoggerService } from '@/core/logger/logger.service.js';
import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Connection } from 'rabbitmq-client';
import { type ZodSchema, z } from 'zod';
import { Queue } from './queue.entity.js';

@Injectable()
export class QueueFactory {
  private rabbit: Connection;
  private connectionAttempts = 0;

  public constructor(
    private readonly logger: LoggerService,
    private readonly config: ConfigurationService,
  ) {
    this.initializeConnection();
  }

  public async initializeConnection() {
    const { host, password, username } = this.config.get('queue');

    this.rabbit = new Connection({ hostname: host, username, password });

    this.rabbit.on('connection', () => {
      this.connectionAttempts = 0;
      this.logger.info('Connected to the queue');
    });

    this.rabbit.on('error', async (error) => {
      this.logger.error('RabbitMQ connection error', error);
      this.reconnect(error);
    });
  }

  // Re-establish connection to RabbitMQ with exponential backoff
  public async reconnect(error: Error) {
    if (this.connectionAttempts > 5) {
      this.logger.error('RabbitMQ connection lost, exceeded maximum reconnection attempts');
      Sentry.captureException(error, { tags: { source: 'rabbitmq' } });

      return error;
    }

    this.connectionAttempts++;
    this.logger.warn('RabbitMQ connection lost, attempting to reconnect...');

    const timeout = 2 ** this.connectionAttempts * 1000;
    await setTimeout(timeout);

    this.initializeConnection();
  }

  public createQueue<T extends ZodSchema, R extends ZodSchema>(params: {
    queueName: string;
    workers?: number;
    eventSchema: T;
    resultSchema?: R;
    timeout?: number;
  }) {
    const { queueName, workers = 3, eventSchema, resultSchema = z.object({ success: z.boolean(), message: z.string() }), timeout } = params;

    const rpcClient = this.rabbit.createRPCClient({
      timeout,
      confirm: true,
      maxAttempts: 3,
    });

    return new Queue(this.rabbit, rpcClient, queueName, workers, eventSchema, resultSchema, this.logger);
  }
}
