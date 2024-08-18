import { type SystemEvent, eventResultSchema, eventSchema } from '@runtipi/shared';
import { type Job, Queue, QueueEvents } from 'bullmq';
import { inject, injectable } from 'inversify';
import type { ILogger } from '@runtipi/shared/node';
import type { ICache } from '@runtipi/cache';

export interface IEventDispatcher {
  dispatchEvent: (event: SystemEvent) => Promise<Job<unknown>>;
  dispatchEventAsync: (event: SystemEvent, timeout?: number) => Promise<{ success: boolean; stdout?: string }>;
  clear: () => Promise<void>;
  close: () => Promise<void>;
  scheduleEvent: (event: SystemEvent, cronExpression: string) => void;
}

@injectable()
export class EventDispatcher implements IEventDispatcher {
  private queue: Queue;

  private queueEvents: QueueEvents;

  constructor(
    @inject('ILogger') private logger: ILogger,
    @inject('ICache') private cache: ICache,
  ) {
    this.queue = new Queue('events', {
      connection: this.cache.getClient(),
    });
    this.queueEvents = new QueueEvents('events', {
      connection: this.cache.getClient(),
    });
  }

  public async cleanRepeatableJobs() {
    const repeatableJobs = await this.queue.getRepeatableJobs();

    if (repeatableJobs) {
      await Promise.all(
        repeatableJobs.map(async (job) => {
          await this.queue.removeRepeatableByKey(job.key);
        }),
      );
    }
  }

  private generateJobId(event: SystemEvent) {
    return [event.type, Date.now()].join('_');
  }

  /**
   * Dispatch an event to the queue
   *
   * @param {SystemEvent} event - Event object
   */
  public dispatchEvent(event: SystemEvent) {
    const jobid = this.generateJobId(event);

    return this.queue.add(jobid, eventSchema.parse(event));
  }

  /**
   * Dispatch an event to the queue and wait for it to finish
   *
   * @param {SystemEvent} event - Event object
   * @returns {Promise<{ success: boolean; stdout?: string }>} - Promise that resolves when the event is done
   */
  public async dispatchEventAsync(event: SystemEvent, timeout: number = 1000 * 60 * 5): Promise<{ success: boolean; stdout?: string }> {
    this.logger.info(`Dispatching event ${JSON.stringify(event)}.`);
    try {
      const job = await this.dispatchEvent(event);
      const result = await job.waitUntilFinished(this.queueEvents, timeout);

      return eventResultSchema.parse(result);
    } catch (e) {
      this.logger.error(`Event failed: ${e}`);
      let message = 'Event failed';
      if (e instanceof Error) {
        message = e.message;
      }
      return { success: false, stdout: message };
    }
  }

  public async clear() {
    await this.cleanRepeatableJobs();
    await this.queue.obliterate({ force: true });
  }

  public scheduleEvent(event: SystemEvent, cronExpression: string) {
    this.logger.info(`Scheduling event ${JSON.stringify(event)} with cron expression ${cronExpression}`);
    const jobid = this.generateJobId(event);

    void this.queue.add(jobid, eventSchema.parse(event), { repeat: { pattern: cronExpression } });
  }

  public async close() {
    await this.queue.close();
    await this.queueEvents.close();
  }
}
