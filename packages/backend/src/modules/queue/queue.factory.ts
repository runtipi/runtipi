import { Injectable } from '@nestjs/common';
import { type AsyncMessage, Connection } from 'rabbitmq-client';
import { type ZodSchema, z } from 'zod';
import { Queue } from './queue.entity';

@Injectable()
export class QueueFactory {
  private rabbit: Connection;

  public constructor() {
    this.initializeConnection();
  }

  private initializeConnection() {
    this.rabbit = new Connection({ url: 'amqp://guest:guest@localhost:5672' });
  }

  public createQueue<T extends ZodSchema, R extends ZodSchema>(params: { queueName: string; workers?: number; eventSchema: T; resultSchema?: R }) {
    const { queueName, workers = 3, eventSchema, resultSchema = z.object({ success: z.boolean(), message: z.string() }) } = params;

    const publisher = this.rabbit.createPublisher({
      confirm: true,
      maxAttempts: 3,
    });

    return new Queue(this, publisher, queueName, workers, eventSchema, resultSchema);
  }

  public createConsumer(queueName: string, callback: (data: AsyncMessage) => void) {
    return this.rabbit.createConsumer({ queue: queueName }, callback);
  }
}
