import { TipiConfig } from '@/server/core/TipiConfig';
import { type SystemEvent, eventResultSchema, eventSchema } from '@runtipi/shared';
import { Queue, QueueEvents } from 'bullmq';
import { Logger } from '../Logger';

export class EventDispatcher {
  private queue;

  private queueEvents;

  private instanceId: string;

  constructor() {
    this.queue = new Queue('events', {
      connection: { host: TipiConfig.getConfig().REDIS_HOST, port: 6379, password: TipiConfig.getConfig().redisPassword },
    });
    this.queueEvents = new QueueEvents('events', {
      connection: { host: TipiConfig.getConfig().REDIS_HOST, port: 6379, password: TipiConfig.getConfig().redisPassword },
    });
    this.instanceId = `${TipiConfig.getConfig().version}-${Date.now()}`;
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
    Logger.info(`Dispatching event ${JSON.stringify(event)}. Instance: ${this.instanceId}`);
    try {
      const job = await this.dispatchEvent(event);
      const result = await job.waitUntilFinished(this.queueEvents, TipiConfig.getConfig().jobTimeout);

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

    void this.queue.add(jobid, eventSchema.parse(event), { repeat: { pattern: cronExpression } });
  }

  public async close() {
    await this.queue.close();
    await this.queueEvents.close();
  }
}
