import { Queue, QueueEvents } from 'bullmq';
import { SystemEvent, eventSchema } from '@runtipi/shared';
import { getEnv } from '@/utils/environment/environment';
import { logger } from '@/utils/logger/logger';
import { TerminalSpinner } from '@/utils/logger/terminal-spinner';

export class AppExecutors {
  private readonly logger;

  private queue: Queue;

  private queueEvents: QueueEvents;

  constructor() {
    const { redisPassword } = getEnv();
    this.logger = logger;
    this.queue = new Queue('events', { connection: { host: '127.0.0.1', port: 6379, password: redisPassword } });
    this.queueEvents = new QueueEvents('events', { connection: { host: '127.0.0.1', port: 6379, password: redisPassword } });
  }

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

    const event = { type: 'app', command: 'stop', appid: appId, form: {}, skipEnv: true } satisfies SystemEvent;
    const job = await this.queue.add(jobid, eventSchema.parse(event));
    const result = await job.waitUntilFinished(this.queueEvents, 1000 * 60 * 5);

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

    const event = { type: 'app', command: 'start', appid: appId, form: {}, skipEnv: true } satisfies SystemEvent;
    const job = await this.queue.add(jobid, eventSchema.parse(event));
    const result = await job.waitUntilFinished(this.queueEvents, 1000 * 60 * 5);

    if (!result.success) {
      spinner.fail(`Failed to start app ${appId} see logs for more details (logs/error.log)`);
    } else {
      spinner.done(`App ${appId} started`);
    }
  };
}
