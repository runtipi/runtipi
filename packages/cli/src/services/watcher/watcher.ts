import { eventSchema } from '@runtipi/shared';
import { Worker } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AppExecutors, RepoExecutors, SystemExecutors } from '@/executors';
import { getEnv } from '@/utils/environment/environment';

const execAsync = promisify(exec);

const runCommand = async (jobData: unknown) => {
  const { installApp, startApp, stopApp, uninstallApp, updateApp, regenerateAppEnv } = new AppExecutors();
  const { cloneRepo, pullRepo } = new RepoExecutors();
  const { systemInfo, restart, update } = new SystemExecutors();

  const event = eventSchema.safeParse(jobData);

  if (!event.success) {
    throw new Error('Event is not valid');
  }

  const { data } = event;

  let success = false;
  let message = `Event has invalid type or args ${JSON.stringify(data)}`;

  if (data.type === 'app') {
    if (data.command === 'install') {
      ({ success, message } = await installApp(data.appid, data.form));
    }

    if (data.command === 'stop') {
      ({ success, message } = await stopApp(data.appid, data.form));
    }

    if (data.command === 'start') {
      ({ success, message } = await startApp(data.appid, data.form));
    }

    if (data.command === 'uninstall') {
      ({ success, message } = await uninstallApp(data.appid, data.form));
    }

    if (data.command === 'update') {
      ({ success, message } = await updateApp(data.appid, data.form));
    }

    if (data.command === 'generate_env') {
      ({ success, message } = await regenerateAppEnv(data.appid, data.form));
    }
  } else if (data.type === 'repo') {
    if (data.command === 'clone') {
      ({ success, message } = await cloneRepo(data.url));
    }

    if (data.command === 'update') {
      ({ success, message } = await pullRepo(data.url));
    }
  } else if (data.type === 'system') {
    if (data.command === 'system_info') {
      ({ success, message } = await systemInfo());
    }

    if (data.command === 'restart') {
      ({ success, message } = await restart());
    }

    if (data.command === 'update') {
      ({ success, message } = await update(data.version));
    }
  }

  return { success, message };
};

const killOtherWorkers = async () => {
  const { stdout } = await execAsync('ps aux | grep "index.js watch" | grep -v grep | awk \'{print $2}\'');

  const pids = stdout.split('\n').filter((pid: string) => pid !== '');

  pids.forEach((pid) => {
    if (pid === process.pid.toString()) {
      console.log('Skipping killing current worker');
      return;
    }

    console.log(`Killing worker with pid ${pid}`);
    try {
      process.kill(Number(pid));
    } catch (e) {
      console.error(`Error killing worker with pid ${pid}: ${e}`);
    }
  });
};

/**
 * Start the worker for the events queue
 */
export const startWorker = async () => {
  await killOtherWorkers();

  const worker = new Worker(
    'events',
    async (job) => {
      console.log(`Processing job ${job.id} with data ${JSON.stringify(job.data)}`);
      const { message, success } = await runCommand(job.data);

      return { success, stdout: message };
    },
    { connection: { host: '127.0.0.1', port: 6379, password: getEnv().redisPassword } },
  );

  worker.on('ready', () => {
    console.log('Worker is ready');
  });

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed with result: ${JSON.stringify(job.returnvalue)}`);
  });

  worker.on('failed', (job) => {
    console.error(`Job ${job?.id} failed with reason ${job?.failedReason}`);
  });

  worker.on('error', async (e) => {
    console.error('An error occurred:', e);
  });
};
