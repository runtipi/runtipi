import cron from 'node-cron';
import type { AsyncMessage, Publisher } from 'rabbitmq-client';
import { type ZodSchema, z } from 'zod';
import type { QueueFactory } from './queue.factory';

const FIVE_MINUTES = 5 * 60 * 1000;

export class Queue<T extends ZodSchema, R extends ZodSchema<{ success: boolean; message: string }>> {
  private queueNameResponse: string;
  private responsePromises: { [id: string]: { resolve: (data: z.output<R>) => void } };

  constructor(
    private queueFactory: QueueFactory,
    private publisher: Publisher,
    private queueName: string,
    private workers: number,
    private eventSchema: T,
    private resultSchema: R,
  ) {
    this.queueNameResponse = `${this.queueName}-response`;
    this.responsePromises = {};
    this.workers = workers;
  }

  private generateEventId(command: string) {
    return `${command}-${Math.random().toString(36).substring(7)}`;
  }

  public publishRepeatable(data: z.input<T>, cronPattern: string) {
    if (!cron.validate(cronPattern)) {
      throw new Error('Invalid cron pattern');
    }

    const eventData = this.eventSchema.safeParse(data);

    cron.schedule(cronPattern, () => {
      this.publisher.send(this.queueName, { eventId: this.generateEventId(data.command), ...eventData.data });
    });
  }

  public onEvent(callback: (data: z.output<T> & { eventId: string }) => void) {
    this.queueFactory.createConsumer(this.queueName, (eventData) => {
      if (Object.keys(this.responsePromises).length > this.workers) {
        this.requeueWithBackoff(eventData);
        return;
      }

      const parsedData = this.eventSchema.and(z.object({ eventId: z.string() })).safeParse(eventData.body);
      if (parsedData.success) {
        callback(parsedData.data);
      }
    });

    this.queueFactory.createConsumer(this.queueNameResponse, ({ body }) => {
      const { resolve } = this.responsePromises[body.eventId] ?? {};

      if (resolve) {
        const response = this.resultSchema.safeParse(body.data);
        if (response.success) {
          resolve({ ...response.data });
        } else {
          console.error('Invalid response data', response.error.flatten());
          resolve({ success: false, message: 'Invalid response data' });
        }

        delete this.responsePromises[body.eventId];
      }
    });
  }

  private requeueWithBackoff(eventData: AsyncMessage) {
    console.warn('Requeuing event due to backpressure');
    const backoffTime = 5000;
    setTimeout(() => {
      this.publisher.send(this.queueName, eventData.body);
    }, backoffTime);
  }

  async publishAsync(event: z.input<T>, timeout = FIVE_MINUTES): Promise<z.output<R>> {
    const eventData = this.eventSchema.safeParse(event);

    if (!eventData.success) {
      throw new Error('Invalid event data');
    }

    const eventId = await this.publish(eventData.data);

    return new Promise((resolve) => {
      this.responsePromises[eventId] = { resolve };

      setTimeout(() => {
        if (this.responsePromises[eventId]) {
          // @ts-ignore - TS doesn't know that the promise is still in the map
          resolve({ success: false, message: 'Timeout' });
          delete this.responsePromises[eventId];
        }
      }, timeout);
    });
  }

  async publish(data: z.input<T>) {
    const eventData = this.eventSchema.safeParse(data);

    if (!eventData.success) {
      throw new Error('Invalid event data');
    }

    const eventId = this.generateEventId(data.command);

    await this.publisher.send(this.queueName, { eventId, ...eventData.data });

    return eventId;
  }

  async sendEventResponse(eventId: string, data: z.input<R>) {
    await this.publisher.send(this.queueNameResponse, { eventId, data });
  }
}
