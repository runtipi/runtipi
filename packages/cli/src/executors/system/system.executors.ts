/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import fs from 'fs';
import cliProgress from 'cli-progress';
import semver from 'semver';
import axios from 'axios';
import boxen from 'boxen';
import path from 'path';
import { spawn } from 'child_process';
import { Stream } from 'stream';
import dotenv from 'dotenv';
import { pathExists } from '@runtipi/shared';
import { AppExecutors } from '../app/app.executors';
import { copySystemFiles, generateSystemEnvFile } from './system.helpers';
import { TerminalSpinner } from '@/utils/logger/terminal-spinner';
import { getEnv } from '@/utils/environment/environment';
import { logger } from '@/utils/logger/logger';
import { execAsync } from '@/utils/exec-async/execAsync';

export class SystemExecutors {
  private readonly rootFolder: string;

  private readonly envFile: string;

  private readonly logger;

  constructor() {
    this.rootFolder = process.cwd();
    this.logger = logger;

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

  public cleanLogs = async () => {
    try {
      await this.logger.flush();
      this.logger.info('Logs cleaned successfully');

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
          await appExecutor.stopApp(app).catch(() => logger.warn(`Failed to stop app ${app}, continuing...`));
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
  public start = async () => {
    const spinner = new TerminalSpinner('Starting Tipi...');
    try {
      await this.logger.flush();

      // Check if user is in docker group
      spinner.setMessage('Checking docker permissions...');
      spinner.start();
      const { stdout: dockerVersion } = await execAsync('docker --version');

      if (!dockerVersion) {
        spinner.fail('Your user is not allowed to run docker commands. Please add your user to the docker group or run Tipi as root.');
        return { success: false, message: 'You need to be in the docker group to run Tipi' };
      }
      spinner.done('User allowed to run docker commands');

      spinner.setMessage('Copying system files...');
      spinner.start();

      this.logger.info('Copying system files...');
      await copySystemFiles();

      spinner.done('System files copied');

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

      // Check for user overrides
      let command: string = `--file ${path.join(this.rootFolder, 'docker-compose.yml')} --env-file ${this.envFile} up --detach --remove-orphans --build`;
      const userComposeFile = path.join(this.rootFolder, 'user-config', 'tipi-compose.yml');
      if (await pathExists(userComposeFile)) {
        command = `--file ${userComposeFile} ${command}`;
      }

      // Start containers
      spinner.setMessage('Starting containers...');
      spinner.start();
      this.logger.info('Starting containers...');

      await execAsync(`docker compose ${command}`);
      spinner.done('Containers started');

      const lines = [
        `Visit: http://${envMap.get('INTERNAL_IP')}:${envMap.get('NGINX_PORT')} to access the dashboard`,
        'Find documentation and guides at: https://runtipi.io',
        'Tipi is entierly written in TypeScript and we are looking for contributors!',
        'Tipi now collects anonymous crash reports to help us improve the product. You can opt-out in the settings of the dashboard.',
      ].join('\n\n');

      console.log(
        boxen(lines, {
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
      this.logger.info(`Updating Tipi to version ${targetVersion}`);

      if (!targetVersion || targetVersion === 'latest') {
        spinner.setMessage('Fetching latest version...');
        const { data } = await axios.get<{ tag_name: string }>('https://api.github.com/repos/runtipi/runtipi/releases/latest');
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
      const fileUrl = `https://github.com/runtipi/runtipi/releases/download/${targetVersion}/${assetName}`;
      this.logger.info(`Downloading Tipi ${targetVersion} from ${fileUrl}`);

      spinner.done(`Target version: ${targetVersion}`);
      spinner.done(`Download url: ${fileUrl}`);

      await this.stop().catch(() => logger.warn('Failed to stop Tipi, trying to update anyway...'));

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
