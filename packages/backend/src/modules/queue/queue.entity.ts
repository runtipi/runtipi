import cron from 'node-cron';
import type { AsyncMessage, Publisher } from 'rabbitmq-client';
import { type ZodSchema, z } from 'zod';
import type { QueueFactory } from './queue.factory';

const FIVE_MINUTES = 5 * 60 * 1000;
const QUEUE_PROCESS_INTERVAL = 1000; // Process queue every second

export class Queue<T extends ZodSchema, R extends ZodSchema<{ success: boolean; message: string }>> {
  private queueNameResponse: string;
  private responsePromises: { [id: string]: { resolve: (data: z.output<R>) => void } };
  private activeTasks: number;
  private taskQueue: AsyncMessage[];
  private callbacks: ((data: z.output<T> & { eventId: string }) => void)[];

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
    this.activeTasks = 0;
    this.taskQueue = [];
    this.callbacks = [];
    this.startQueueProcessing();
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

  private startQueueProcessing() {
    setInterval(() => {
      if (this.taskQueue.length > 0) {
        this.processNextTask();
      }
    }, QUEUE_PROCESS_INTERVAL);
  }

  private processNextTask() {
    if (this.activeTasks >= this.workers || this.taskQueue.length === 0) {
      return;
    }

    const eventData = this.taskQueue.shift();
    if (!eventData) return;

    const parsedData = this.eventSchema.and(z.object({ eventId: z.string() })).safeParse(eventData.body);
    if (!parsedData.success) return;

    this.activeTasks++;
    for (const callback of this.callbacks) {
      callback({ ...parsedData.data, eventId: parsedData.data.eventId });
    }
  }

  public onEvent(callback: (data: z.output<T> & { eventId: string }) => void) {
    this.callbacks.push(callback);

    this.queueFactory.createConsumer(this.queueName, (eventData) => {
      this.taskQueue.push(eventData);
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
        this.activeTasks--;
        delete this.responsePromises[body.eventId];
      }
    });
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
