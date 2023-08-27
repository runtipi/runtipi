import { Queue } from 'bullmq';
import fs from 'fs';
import cliProgress from 'cli-progress';
import semver from 'semver';
import axios from 'axios';
import boxen from 'boxen';
import path from 'path';
import { exec, spawn } from 'child_process';
import si from 'systeminformation';
import { Stream } from 'stream';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { SystemEvent } from '@runtipi/shared';
import { AppExecutors } from '../app/app.executors';
import { copySystemFiles, generateSystemEnvFile, generateTlsCertificates } from './system.helpers';
import { TerminalSpinner } from '@/utils/logger/terminal-spinner';
import { pathExists } from '@/utils/fs-helpers';
import { getEnv } from '@/utils/environment/environment';
import { fileLogger } from '@/utils/logger/file-logger';
import { runPostgresMigrations } from '@/utils/migrations/run-migration';

const execAsync = promisify(exec);

export class SystemExecutors {
  private readonly rootFolder: string;

  private readonly envFile: string;

  constructor() {
    this.rootFolder = process.cwd();

    this.envFile = path.join(this.rootFolder, '.env');
  }

  private handleSystemError = (err: unknown) => {
    if (err instanceof Error) {
      fileLogger.error(`An error occurred: ${err.message}`);
      return { success: false, message: err.message };
    }
    fileLogger.error(`An error occurred: ${err}`);

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

  private ensureFilePermissions = async (rootFolderHost: string, logSudoRequest = true) => {
    // if we are running as root, we don't need to change permissions
    if (process.getuid && process.getuid() === 0) {
      return;
    }

    if (logSudoRequest) {
      const logger = new TerminalSpinner('');
      logger.log('Tipi needs to change permissions on some files and folders and will ask for your password.');
    }

    const filesAndFolders = [
      path.join(rootFolderHost, 'apps'),
      path.join(rootFolderHost, 'logs'),
      path.join(rootFolderHost, 'media'),
      path.join(rootFolderHost, 'repos'),
      path.join(rootFolderHost, 'state'),
      path.join(rootFolderHost, 'traefik'),
      path.join(rootFolderHost, '.env'),
      path.join(rootFolderHost, 'docker-compose.yml'),
      path.join(rootFolderHost, 'VERSION'),
    ];

    // Give permission to read and write to all files and folders for the current user
    await Promise.all(
      filesAndFolders.map(async (fileOrFolder) => {
        if (await pathExists(fileOrFolder)) {
          if (process.getgid && process.getuid) {
            await execAsync(`sudo chown -R ${process.getuid()}:${process.getgid()} ${fileOrFolder}`);
          }

          await execAsync(`sudo chmod -R 750 ${fileOrFolder}`);
        }
      }),
    );
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

        await Promise.all(
          apps.map(async (app) => {
            const appSpinner = new TerminalSpinner(`Stopping ${app}...`);
            appSpinner.start();
            await appExecutor.stopApp(app, {}, true);
            appSpinner.done(`${app} stopped`);
          }),
        );
      }

      spinner.setMessage('Stopping containers...');
      spinner.start();
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
  public start = async (permissions = true) => {
    const spinner = new TerminalSpinner('Starting Tipi...');
    try {
      if (permissions) {
        await this.ensureFilePermissions(this.rootFolder);
      }

      spinner.start();
      spinner.setMessage('Copying system files...');
      await copySystemFiles();

      spinner.done('System files copied');

      if (permissions) {
        await this.ensureFilePermissions(this.rootFolder, false);
      }

      spinner.setMessage('Generating system env file...');
      spinner.start();
      const envMap = await generateSystemEnvFile();
      spinner.done('System env file generated');

      // Reload env variables after generating the env file
      dotenv.config({ path: this.envFile, override: true });

      // Stop and Remove container tipi if exists
      spinner.setMessage('Stopping and removing containers...');
      spinner.start();
      await execAsync('docker rm -f tipi-db');
      await execAsync('docker rm -f tipi-redis');
      await execAsync('docker rm -f tipi-dashboard');
      await execAsync('docker rm -f tipi-reverse-proxy');
      spinner.done('Containers stopped and removed');

      // Pull images
      spinner.setMessage('Pulling images...');
      spinner.start();
      await execAsync(`docker compose --env-file "${this.envFile}" pull`);

      spinner.done('Images pulled');

      // Start containers
      spinner.setMessage('Starting containers...');
      spinner.start();
      await execAsync(`docker compose --env-file "${this.envFile}" up --detach --remove-orphans --build`);

      spinner.done('Containers started');

      // start watcher cli in the background
      spinner.setMessage('Starting watcher...');
      spinner.start();

      await generateTlsCertificates({ domain: envMap.get('LOCAL_DOMAIN') });

      const out = fs.openSync('./logs/watcher.log', 'a');
      const err = fs.openSync('./logs/watcher.log', 'a');

      const subprocess = spawn('./runtipi-cli', [process.argv[1] as string, 'watch'], { cwd: this.rootFolder, detached: true, stdio: ['ignore', out, err] });
      subprocess.unref();

      spinner.done('Watcher started');

      const queue = new Queue('events', { connection: { host: '127.0.0.1', port: 6379, password: envMap.get('REDIS_PASSWORD') } });
      await queue.obliterate({ force: true });

      // Initial jobs
      await queue.add(`${Math.random().toString()}_system_info`, { type: 'system', command: 'system_info' } as SystemEvent);
      await queue.add(`${Math.random().toString()}_repo_clone`, { type: 'repo', command: 'clone', url: envMap.get('APPS_REPO_URL') } as SystemEvent);

      // Scheduled jobs
      await queue.add(`${Math.random().toString()}_repo_update`, { type: 'repo', command: 'update', url: envMap.get('APPS_REPO_URL') } as SystemEvent, { repeat: { pattern: '*/30 * * * *' } });
      await queue.add(`${Math.random().toString()}_system_info`, { type: 'system', command: 'system_info' } as SystemEvent, { repeat: { pattern: '* * * * *' } });

      await queue.close();

      spinner.setMessage('Running database migrations...');
      spinner.start();

      await runPostgresMigrations({
        postgresHost: '127.0.0.1',
        postgresDatabase: envMap.get('POSTGRES_DBNAME') as string,
        postgresUsername: envMap.get('POSTGRES_USERNAME') as string,
        postgresPassword: envMap.get('POSTGRES_PASSWORD') as string,
        postgresPort: envMap.get('POSTGRES_PORT') as string,
      });

      spinner.done('Database migrations complete');

      console.log(
        boxen(`Visit: http://${envMap.get('INTERNAL_IP')}:${envMap.get('NGINX_PORT')} to access the dashboard\n\nFind documentation and guides at: https://runtipi.io`, {
          title: 'Tipi successfully started 🎉',
          titleAlignment: 'center',
          padding: 1,
          borderStyle: 'double',
          borderColor: 'green',
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
      await this.start();
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

      if (!targetVersion || targetVersion === 'latest') {
        spinner.setMessage('Fetching latest version...');
        const { data } = await axios.get<{ tag_name: string }>('https://api.github.com/repos/meienberger/runtipi/releases');
        targetVersion = data.tag_name;
      }

      if (!semver.valid(targetVersion)) {
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

      spinner.done(`Target version: ${targetVersion}`);
      spinner.done(`Download url: ${fileUrl}`);

      await this.stop();

      console.log(`Downloading Tipi ${targetVersion}...`);

      const bar = new cliProgress.SingleBar({}, cliProgress.Presets.rect);
      bar.start(100, 0);

      await new Promise((resolve, reject) => {
        axios<Stream>({
          method: 'GET',
          url: fileUrl,
          responseType: 'stream',
          onDownloadProgress: (progress) => {
            bar.update(Math.round((progress.loaded / (progress.total || 0)) * 100));
          },
        }).then((response) => {
          const writer = fs.createWriteStream(savePath);
          response.data.pipe(writer);

          writer.on('error', (err) => {
            bar.stop();
            spinner.fail(`\nFailed to download Tipi ${targetVersion}`);
            reject(err);
          });

          writer.on('finish', () => {
            bar.stop();
            resolve('');
          });
        });
      }).catch((e) => {
        spinner.fail(`\nFailed to download Tipi ${targetVersion}. Please make sure this version exists on GitHub.`);
        throw e;
      });

      spinner.done(`Tipi ${targetVersion} downloaded`);
      await fs.promises.chmod(savePath, 0o755);

      spinner.setMessage('Replacing old cli...');
      spinner.start();

      // Delete old cli
      if (await pathExists(path.join(rootFolderHost, 'runtipi-cli'))) {
        await fs.promises.unlink(path.join(rootFolderHost, 'runtipi-cli'));
      }

      // Delete VERSION file
      if (await pathExists(path.join(rootFolderHost, 'VERSION'))) {
        await fs.promises.unlink(path.join(rootFolderHost, 'VERSION'));
      }

      // Rename downloaded cli to runtipi-cli
      await fs.promises.rename(savePath, path.join(rootFolderHost, 'runtipi-cli'));
      spinner.done('Old cli replaced');

      // Wait for 3 second to make sure the old cli is gone
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const childProcess = spawn('./runtipi-cli', [process.argv[1] as string, 'start', '--no-permissions']);

      childProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
      });

      childProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });

      return { success: true, message: 'Tipi updated' };
    } catch (e) {
      spinner.fail('Tipi update failed, see logs for more details (logs/error.log)');
      return this.handleSystemError(e);
    }
  };
}
