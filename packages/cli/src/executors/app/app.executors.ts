import { Queue, QueueEvents } from 'bullmq';
import { SystemEvent, eventSchema } from '@runtipi/shared';
import { getEnv } from '@/utils/environment/environment';
import { logger } from '@/utils/logger/logger';
import { TerminalSpinner } from '@/utils/logger/terminal-spinner';

export class AppExecutors {
  private readonly logger;

  constructor() {
    this.logger = logger;
  }

  private getQueue = () => {
    const { redisPassword } = getEnv();
    const queue = new Queue('events', { connection: { host: '127.0.0.1', port: 6379, password: redisPassword } });
    const queueEvents = new QueueEvents('events', { connection: { host: '127.0.0.1', port: 6379, password: redisPassword } });

    return { queue, queueEvents };
  };

  private generateJobId = (event: Record<string, unknown>) => {
    const { appId, action } = event;
    return `${appId}-${action}`;
  };

  /**
   * Stops an app
   * @param {string} appId - The id of the app to stop
   */
  public stopApp = async (appId: string) => {
    const spinner = new TerminalSpinner(`Stopping app ${appId}`);
    spinner.start();

    const jobid = this.generateJobId({ appId, action: 'stop' });

    const { queue, queueEvents } = this.getQueue();
    const event = { type: 'app', command: 'stop', appid: appId, form: {}, skipEnv: true } satisfies SystemEvent;
    const job = await queue.add(jobid, eventSchema.parse(event));
    const result = await job.waitUntilFinished(queueEvents, 1000 * 60);

    await queueEvents.close();
    await queue.close();

    if (!result?.success) {
      this.logger.error(result?.message);
      spinner.fail(`Failed to stop app ${appId} see logs for more details (logs/error.log)`);
    } else {
      spinner.done(`App ${appId} stopped`);
    }
  };

  public startApp = async (appId: string) => {
    const spinner = new TerminalSpinner(`Starting app ${appId}`);
    spinner.start();

    const jobid = this.generateJobId({ appId, action: 'start' });

    const { queue, queueEvents } = this.getQueue();
    const event = { type: 'app', command: 'start', appid: appId, form: {}, skipEnv: true } satisfies SystemEvent;
    const job = await queue.add(jobid, eventSchema.parse(event));
    const result = await job.waitUntilFinished(queueEvents, 1000 * 60 * 5);

    await queueEvents.close();
    await queue.close();

    if (!result.success) {
      spinner.fail(`Failed to start app ${appId} see logs for more details (logs/error.log)`);
    } else {
      spinner.done(`App ${appId} started`);
    }
  };
}
