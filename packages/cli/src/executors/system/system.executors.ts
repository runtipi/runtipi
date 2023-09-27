/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Queue } from 'bullmq';
import fs from 'fs';
import cliProgress from 'cli-progress';
import semver from 'semver';
import axios from 'axios';
import boxen from 'boxen';
import path from 'path';
import { spawn } from 'child_process';
import si from 'systeminformation';
import { Stream } from 'stream';
import dotenv from 'dotenv';
import { SystemEvent } from '@runtipi/shared';
import chalk from 'chalk';
import { killOtherWorkers } from 'src/services/watcher/watcher';
import { AppExecutors } from '../app/app.executors';
import { copySystemFiles, generateSystemEnvFile, generateTlsCertificates } from './system.helpers';
import { TerminalSpinner } from '@/utils/logger/terminal-spinner';
import { pathExists } from '@/utils/fs-helpers';
import { getEnv } from '@/utils/environment/environment';
import { fileLogger } from '@/utils/logger/file-logger';
import { runPostgresMigrations } from '@/utils/migrations/run-migration';
import { getUserIds } from '@/utils/environment/user';
import { execAsync } from '@/utils/exec-async/execAsync';

export class SystemExecutors {
  private readonly rootFolder: string;

  private readonly envFile: string;

  private readonly logger;

  constructor() {
    this.rootFolder = process.cwd();
    this.logger = fileLogger;

    this.envFile = path.join(this.rootFolder, '.env');
  }

  private handleSystemError = (err: unknown) => {
    if (err instanceof Error) {
      this.logger.error(`An error occurred: ${err.message}`);
      return { success: false, message: err.message };
    }
    this.logger.error(`An error occurred: ${err}`);

    return { success: false, message: `An error occurred: ${err}` };
  };

  private getSystemLoad = async () => {
    const { currentLoad } = await si.currentLoad();
    const mem = await si.mem();
    const [disk0] = await si.fsSize();

    return {
      cpu: { load: currentLoad },
      memory: { total: mem.total, used: mem.used, available: mem.available },
      disk: { total: disk0?.size, used: disk0?.used, available: disk0?.available },
    };
  };

  private ensureFilePermissions = async (rootFolderHost: string) => {
    const logger = new TerminalSpinner('');

    const filesAndFolders = [
      path.join(rootFolderHost, 'apps'),
      path.join(rootFolderHost, 'logs'),
      path.join(rootFolderHost, 'media'),
      path.join(rootFolderHost, 'repos'),
      path.join(rootFolderHost, 'state'),
      path.join(rootFolderHost, 'traefik'),
      path.join(rootFolderHost, '.env'),
      path.join(rootFolderHost, 'VERSION'),
      path.join(rootFolderHost, 'docker-compose.yml'),
    ];

    const files600 = [path.join(rootFolderHost, 'traefik', 'shared', 'acme.json')];

    this.logger.info('Setting file permissions a+rwx on required files');
    // Give permission to read and write to all files and folders for the current user
    for (const fileOrFolder of filesAndFolders) {
      if (await pathExists(fileOrFolder)) {
        this.logger.info(`Setting permissions on ${fileOrFolder}`);
        await execAsync(`chmod -R a+rwx ${fileOrFolder}`).catch(() => {
          logger.fail(`Failed to set permissions on ${fileOrFolder}`);
        });
        this.logger.info(`Successfully set permissions on ${fileOrFolder}`);
      }
    }

    this.logger.info('Setting file permissions 600 on required files');

    for (const fileOrFolder of files600) {
      if (await pathExists(fileOrFolder)) {
        this.logger.info(`Setting permissions on ${fileOrFolder}`);
        await execAsync(`chmod 600 ${fileOrFolder}`).catch(() => {
          logger.fail(`Failed to set permissions on ${fileOrFolder}`);
        });
        this.logger.info(`Successfully set permissions on ${fileOrFolder}`);
      }
    }
  };

  public cleanLogs = async () => {
    try {
      const { rootFolderHost } = getEnv();

      await fs.promises.rm(path.join(rootFolderHost, 'logs'), { recursive: true, force: true });
      await fs.promises.mkdir(path.join(rootFolderHost, 'logs'));

      this.logger.info('Logs cleaned successfully');

      return { success: true, message: '' };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };

  public systemInfo = async () => {
    try {
      const { rootFolderHost } = getEnv();
      const systemLoad = await this.getSystemLoad();

      await fs.promises.writeFile(path.join(rootFolderHost, 'state', 'system-info.json'), JSON.stringify(systemLoad, null, 2));
      await fs.promises.chmod(path.join(rootFolderHost, 'state', 'system-info.json'), 0o777);

      return { success: true, message: '' };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };

  /**
   * This method will stop Tipi
   * It will stop all the apps and then stop the main containers.
   */
  public stop = async () => {
    const spinner = new TerminalSpinner('Stopping Tipi...');

    try {
      if (await pathExists(path.join(this.rootFolder, 'apps'))) {
        const apps = await fs.promises.readdir(path.join(this.rootFolder, 'apps'));
        const appExecutor = new AppExecutors();

        // eslint-disable-next-line no-restricted-syntax
        for (const app of apps) {
          spinner.setMessage(`Stopping ${app}...`);
          spinner.start();
          await appExecutor.stopApp(app, {}, true);
          spinner.done(`${app} stopped`);
        }
      }

      spinner.setMessage('Stopping containers...');
      spinner.start();

      this.logger.info('Stopping main containers...');
      await execAsync('docker compose down --remove-orphans --rmi local');

      spinner.done('Tipi successfully stopped');

      return { success: true, message: 'Tipi stopped' };
    } catch (e) {
      spinner.fail('Tipi failed to stop. Please check the logs for more details (logs/error.log)');
      return this.handleSystemError(e);
    }
  };

  /**
   * This method will start Tipi.
   * It will copy the system files, generate the system env file, pull the images and start the containers.
   */
  public start = async (sudo = true, killWatchers = true) => {
    const spinner = new TerminalSpinner('Starting Tipi...');
    try {
      const { isSudo } = getUserIds();

      if (!sudo) {
        console.log(
          boxen(
            "You are running in sudoless mode. While Tipi should work as expected, you'll probably run into permission issues and will have to manually fix them. We recommend running Tipi with sudo for beginners.",
            {
              title: '⛔️Sudoless mode',
              titleAlignment: 'center',
              textAlignment: 'center',
              padding: 1,
              borderStyle: 'double',
              borderColor: 'red',
              margin: { top: 1, bottom: 1 },
              width: 80,
            },
          ),
        );
      }

      this.logger.info('Killing other workers...');

      if (killWatchers) {
        await killOtherWorkers();
      }

      if (!isSudo && sudo) {
        console.log(chalk.red('Tipi needs to run as root to start. Use sudo ./runtipi-cli start'));
        throw new Error('Tipi needs to run as root to start. Use sudo ./runtipi-cli start');
      }

      spinner.start();
      spinner.setMessage('Copying system files...');

      this.logger.info('Copying system files...');
      await copySystemFiles();

      spinner.done('System files copied');

      if (sudo) {
        await this.ensureFilePermissions(this.rootFolder);
      }

      spinner.setMessage('Generating system env file...');
      spinner.start();
      this.logger.info('Generating system env file...');
      const envMap = await generateSystemEnvFile();
      spinner.done('System env file generated');

      // Reload env variables after generating the env file
      this.logger.info('Reloading env variables...');
      dotenv.config({ path: this.envFile, override: true });

      // Pull images
      spinner.setMessage('Pulling images...');
      spinner.start();
      this.logger.info('Pulling new images...');
      await execAsync(`docker compose --env-file ${this.envFile} pull`);

      spinner.done('Images pulled');

      // Start containers
      spinner.setMessage('Starting containers...');
      spinner.start();
      this.logger.info('Starting containers...');

      await execAsync(`docker compose --env-file ${this.envFile} up --detach --remove-orphans --build`);
      spinner.done('Containers started');

      // start watcher cli in the background
      spinner.setMessage('Starting watcher...');
      spinner.start();

      this.logger.info('Generating TLS certificates...');
      await generateTlsCertificates({ domain: envMap.get('LOCAL_DOMAIN') });

      if (killWatchers) {
        this.logger.info('Starting watcher...');
        const subprocess = spawn('./runtipi-cli', [process.argv[1] as string, 'watch'], { cwd: this.rootFolder, detached: true, stdio: ['ignore', 'ignore', 'ignore'] });
        subprocess.unref();
      }

      spinner.done('Watcher started');

      this.logger.info('Starting queue...');
      const queue = new Queue('events', { connection: { host: '127.0.0.1', port: 6379, password: envMap.get('REDIS_PASSWORD') } });
      this.logger.info('Obliterating queue...');
      await queue.obliterate({ force: true });

      // Initial jobs
      this.logger.info('Adding initial jobs to queue...');
      await queue.add(`${Math.random().toString()}_system_info`, { type: 'system', command: 'system_info' } as SystemEvent);
      await queue.add(`${Math.random().toString()}_repo_clone`, { type: 'repo', command: 'clone', url: envMap.get('APPS_REPO_URL') } as SystemEvent);

      // Scheduled jobs
      this.logger.info('Adding scheduled jobs to queue...');
      await queue.add(`${Math.random().toString()}_repo_update`, { type: 'repo', command: 'update', url: envMap.get('APPS_REPO_URL') } as SystemEvent, { repeat: { pattern: '*/30 * * * *' } });
      await queue.add(`${Math.random().toString()}_system_info`, { type: 'system', command: 'system_info' } as SystemEvent, { repeat: { pattern: '* * * * *' } });

      this.logger.info('Closing queue...');
      await queue.close();

      spinner.setMessage('Running database migrations...');
      spinner.start();

      this.logger.info('Running database migrations...');
      await runPostgresMigrations({
        postgresHost: '127.0.0.1',
        postgresDatabase: envMap.get('POSTGRES_DBNAME') as string,
        postgresUsername: envMap.get('POSTGRES_USERNAME') as string,
        postgresPassword: envMap.get('POSTGRES_PASSWORD') as string,
        postgresPort: envMap.get('POSTGRES_PORT') as string,
      });

      spinner.done('Database migrations complete');

      // Start all apps
      const appExecutor = new AppExecutors();
      this.logger.info('Starting all apps...');
      await appExecutor.startAllApps();

      console.log(
        boxen(`Visit: http://${envMap.get('INTERNAL_IP')}:${envMap.get('NGINX_PORT')} to access the dashboard\n\nFind documentation and guides at: https://runtipi.io`, {
          title: 'Tipi successfully started 🎉',
          titleAlignment: 'center',
          textAlignment: 'center',
          padding: 1,
          borderStyle: 'double',
          borderColor: 'green',
          width: 80,
          margin: { top: 1 },
        }),
      );

      return { success: true, message: 'Tipi started' };
    } catch (e) {
      spinner.fail('Tipi failed to start. Please check the logs for more details (logs/error.log)');
      return this.handleSystemError(e);
    }
  };

  /**
   * This method will stop and start Tipi.
   */
  public restart = async () => {
    try {
      await this.stop();
      await this.start(true, false);
      return { success: true, message: '' };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };

  /**
   * This method will create a password change request file in the state folder.
   */
  public resetPassword = async () => {
    try {
      const { rootFolderHost } = getEnv();
      await fs.promises.writeFile(path.join(rootFolderHost, 'state', 'password-change-request'), '');
      return { success: true, message: '' };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };

  /**
   * Given a target version, this method will download the corresponding release from GitHub and replace the current
   * runtipi-cli binary with the new one.
   * @param {string} target
   */
  public update = async (target: string) => {
    const spinner = new TerminalSpinner('Evaluating target version...');
    try {
      spinner.start();
      let targetVersion = target;
      this.logger.info(`Updating Tipi to version ${targetVersion}`);

      if (!targetVersion || targetVersion === 'latest') {
        spinner.setMessage('Fetching latest version...');
        const { data } = await axios.get<{ tag_name: string }>('https://api.github.com/repos/meienberger/runtipi/releases/latest');
        this.logger.info(`Getting latest version from GitHub: ${data.tag_name}`);
        targetVersion = data.tag_name;
      }

      if (!semver.valid(targetVersion)) {
        this.logger.error(`Invalid version: ${targetVersion}`);
        spinner.fail(`Invalid version: ${targetVersion}`);
        throw new Error(`Invalid version: ${targetVersion}`);
      }

      const { rootFolderHost, arch } = getEnv();

      let assetName = 'runtipi-cli-linux-x64';
      if (arch === 'arm64') {
        assetName = 'runtipi-cli-linux-arm64';
      }

      const fileName = `runtipi-cli-${targetVersion}`;
      const savePath = path.join(rootFolderHost, fileName);
      const fileUrl = `https://github.com/meienberger/runtipi/releases/download/${targetVersion}/${assetName}`;
      this.logger.info(`Downloading Tipi ${targetVersion} from ${fileUrl}`);

      spinner.done(`Target version: ${targetVersion}`);
      spinner.done(`Download url: ${fileUrl}`);

      await this.stop();

      this.logger.info(`Downloading Tipi ${targetVersion}...`);

      const bar = new cliProgress.SingleBar({}, cliProgress.Presets.rect);
      bar.start(100, 0);

      await new Promise((resolve, reject) => {
        axios<Stream>({
          method: 'GET',
          url: fileUrl,
          responseType: 'stream',
          onDownloadProgress: (progress) => {
            this.logger.info(`Download progress: ${Math.round((progress.loaded / (progress.total || 0)) * 100)}%`);
            bar.update(Math.round((progress.loaded / (progress.total || 0)) * 100));
          },
        }).then((response) => {
          const writer = fs.createWriteStream(savePath);
          response.data.pipe(writer);

          writer.on('error', (err) => {
            bar.stop();
            this.logger.error(`Failed to download Tipi: ${err}`);
            spinner.fail(`\nFailed to download Tipi ${targetVersion}`);
            reject(err);
          });

          writer.on('finish', () => {
            this.logger.info('Download complete');
            bar.stop();
            resolve('');
          });
        });
      }).catch((e) => {
        this.logger.error(`Failed to download Tipi: ${e}`);
        spinner.fail(`\nFailed to download Tipi ${targetVersion}. Please make sure this version exists on GitHub.`);
        throw e;
      });

      spinner.done(`Tipi ${targetVersion} downloaded`);
      this.logger.info(`Changing permissions on ${savePath}`);
      await fs.promises.chmod(savePath, 0o755);

      spinner.setMessage('Replacing old cli...');
      spinner.start();

      // Delete old cli
      if (await pathExists(path.join(rootFolderHost, 'runtipi-cli'))) {
        this.logger.info('Deleting old cli...');
        await fs.promises.unlink(path.join(rootFolderHost, 'runtipi-cli'));
      }

      // Delete VERSION file
      if (await pathExists(path.join(rootFolderHost, 'VERSION'))) {
        this.logger.info('Deleting VERSION file...');
        await fs.promises.unlink(path.join(rootFolderHost, 'VERSION'));
      }

      // Rename downloaded cli to runtipi-cli
      this.logger.info('Renaming new cli to runtipi-cli...');
      await fs.promises.rename(savePath, path.join(rootFolderHost, 'runtipi-cli'));
      spinner.done('Old cli replaced');

      // Wait for 3 second to make sure the old cli is gone
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 3000));

      this.logger.info('Starting new cli...');
      const childProcess = spawn('./runtipi-cli', [process.argv[1] as string, 'start']);

      childProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
      });

      childProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });

      spinner.done(`Tipi ${targetVersion} successfully updated. Tipi is now starting, wait for this process to finish...`);

      return { success: true, message: 'Tipi updated' };
    } catch (e) {
      spinner.fail('Tipi update failed, see logs for more details (logs/error.log)');
      return this.handleSystemError(e);
    }
  };
}
