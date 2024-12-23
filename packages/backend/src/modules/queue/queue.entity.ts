import type { LoggerService } from '@/core/logger/logger.service';
import cron from 'node-cron';
import type { Connection, RPCClient } from 'rabbitmq-client';
import { type ZodSchema, z } from 'zod';

export class Queue<T extends ZodSchema, R extends ZodSchema<{ success: boolean; message: string }>> {
  constructor(
    private rabbit: Connection,
    private rpcClient: RPCClient,
    private queueName: string,
    private workers: number,
    private eventSchema: T,
    private resultSchema: R,
    private logger: LoggerService,
  ) {}

  public onEvent(callback: (data: z.output<T> & { eventId: string }, reply: (response: z.input<R>) => Promise<void>) => Promise<void>) {
    this.rabbit.createConsumer({ queue: this.queueName, concurrency: this.workers }, async (req, reply) => {
      try {
        await callback(req.body, reply);
      } catch (error) {
        this.logger.error('Error in consumer callback:', error);
        await reply({ success: false, message: (error as Error)?.message });
      }
    });
  }

  async publish(event: z.input<T>): Promise<z.output<R>> {
    try {
      const eventData = this.eventSchema.safeParse(event);

      if (!eventData.success) {
        throw new Error('Invalid event data');
      }

      const res = await this.rpcClient.send(this.queueName, eventData.data);
      const response = this.resultSchema.safeParse(res.body);

      if (response.success) {
        return response.data;
      }

      throw new Error('Invalid response schema');
    } catch (err) {
      return { success: false, message: (err as Error)?.message };
    }
  }

  public publishRepeatable(data: z.input<T>, cronPattern: string) {
    if (!cron.validate(cronPattern)) {
      throw new Error('Invalid cron pattern');
    }

    const eventData = this.eventSchema.safeParse(data);

    if (!eventData.success) {
      throw new Error('Invalid event data');
    }

    cron.schedule(cronPattern, async () => {
      try {
        await this.rpcClient.send(this.queueName, eventData.data);
      } catch (e) {
        this.logger.error('Error in cron job:', e);
      }
    });
  }
}
