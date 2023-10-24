import { eventSchema } from '@runtipi/shared';
import { Worker } from 'bullmq';
import { AppExecutors, RepoExecutors, SystemExecutors } from '@/executors';
import { getEnv } from '@/utils/environment/environment';
import { getUserIds } from '@/utils/environment/user';
import { fileLogger } from '@/utils/logger/file-logger';
import { execAsync } from '@/utils/exec-async/execAsync';

const runCommand = async (jobData: unknown) => {
  const { gid, uid } = getUserIds();
  fileLogger.info(`Running command with uid ${uid} and gid ${gid}`);

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

export const killOtherWorkers = async () => {
  const { stdout } = await execAsync('ps aux | grep "index.js watch" | grep -v grep | awk \'{print $2}\'');
  const { stdout: stdoutInherit } = await execAsync('ps aux | grep "runtipi-cli watch" | grep -v grep | awk \'{print $2}\'');

  fileLogger.info(`Killing other workers with pids ${stdout} and ${stdoutInherit}`);

  const pids = stdout.split('\n').filter((pid: string) => pid !== '');
  const pidsInherit = stdoutInherit.split('\n').filter((pid: string) => pid !== '');

  pids.concat(pidsInherit).forEach((pid) => {
    fileLogger.info(`Killing worker with pid ${pid}`);
    try {
      process.kill(Number(pid));
    } catch (e) {
      fileLogger.error(`Error killing worker with pid ${pid}: ${e}`);
    }
  });
};

/**
 * Start the worker for the events queue
 */
export const startWorker = async () => {
  const worker = new Worker(
    'events',
    async (job) => {
      fileLogger.info(`Processing job ${job.id} with data ${JSON.stringify(job.data)}`);
      const { message, success } = await runCommand(job.data);

      return { success, stdout: message };
    },
    { connection: { host: '127.0.0.1', port: 6379, password: getEnv().redisPassword, connectTimeout: 60000 }, removeOnComplete: { count: 200 }, removeOnFail: { count: 500 } },
  );

  worker.on('ready', () => {
    fileLogger.info('Worker is ready');
  });

  worker.on('completed', (job) => {
    fileLogger.info(`Job ${job.id} completed with result:`, JSON.stringify(job.returnvalue));
  });

  worker.on('failed', (job) => {
    fileLogger.error(`Job ${job?.id} failed with reason ${job?.failedReason}`);
  });

  worker.on('error', async (e) => {
    fileLogger.debug(`Worker error: ${e}`);
  });
};
