import { Queue, QueueEvents } from 'bullmq';
import { eventResultSchema, eventSchema, SystemEvent } from '@runtipi/shared';
import { Logger } from '../Logger';

export class EventDispatcher {
  private queue;

  private queueEvents;

  private timeout: NodeJS.Timeout;

  constructor(reference: string) {
    const {} = process.env;
    this.queue = new Queue('events', {
      connection: { host: process.env.REDIS_HOST, port: 6379, password: process.env.REDIS_PASSWORD },
    });
    this.queueEvents = new QueueEvents('events', {
      connection: { host: process.env.REDIS_HOST, port: 6379, password: process.env.REDIS_PASSWORD },
    });

    this.timeout = setTimeout(() => {
      Logger.debug(`Redis connection is running for more than 30 seconds. Consider closing it. reference: ${reference}`);
    }, 30000);
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
  public async dispatchEventAsync(event: SystemEvent): Promise<{ success: boolean; stdout?: string }> {
    Logger.info(`Dispatching event ${JSON.stringify(event)}`);
    try {
      const job = await this.dispatchEvent(event);
      const result = await job.waitUntilFinished(this.queueEvents, 1000 * 60 * 5);

      return eventResultSchema.parse(result);
    } catch (e) {
      Logger.error(`Event failed: ${e}`);
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
    Logger.info(`Scheduling event ${JSON.stringify(event)} with cron expression ${cronExpression}`);
    const jobid = this.generateJobId(event);

    this.queue.add(jobid, eventSchema.parse(event), { repeat: { pattern: cronExpression } });
  }

  public async close() {
    await this.queue.close();
    await this.queueEvents.close();
    clearTimeout(this.timeout);
  }
}
