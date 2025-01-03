import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Connection } from 'rabbitmq-client';
import { type ZodSchema, z } from 'zod';
import { Queue } from './queue.entity';

@Injectable()
export class QueueFactory {
  private rabbit: Connection;

  public constructor(private readonly logger: LoggerService) {
    this.initializeConnection();
  }

  private initializeConnection() {
    this.rabbit = new Connection({ url: 'amqp://guest:guest@localhost:5672' });

    this.rabbit.on('error', (error) => {
      this.logger.error('RabbitMQ connection error:', error);
      Sentry.captureException(error, { tags: { source: 'rabbitmq' } });
    });
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
