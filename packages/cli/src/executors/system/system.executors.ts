import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec, spawn } from 'child_process';
import si from 'systeminformation';
import { createLogger } from '@runtipi/shared';
import { AppExecutors } from '../app/app.executors';
import { copySystemFiles, generateSystemEnvFile } from './system.helpers';
import { TerminalSpinner } from '@/utils/logger/terminal-spinner';

const logger = createLogger('system-executors', path.join(process.cwd(), 'logs'));

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
      logger.error(`An error occurred: ${err.message}`);
      return { success: false, message: err.message };
    }

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

  public systemInfo = async () => {
    try {
      const systemLoad = await this.getSystemLoad();

      await fs.promises.writeFile(path.join(this.rootFolder, 'state', 'system-info.json'), JSON.stringify(systemLoad, null, 2));
      await fs.promises.chmod(path.join(this.rootFolder, 'state', 'system-info.json'), 0o777);

      return { success: true, message: '' };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };

  public stop = async () => {
    try {
      const apps = await fs.promises.readdir(path.join(this.rootFolder, 'apps'));
      const appExecutor = new AppExecutors();

      await Promise.all(
        apps.map(async (app) => {
          logger.info(`Stopping ${app}...`);
          await appExecutor.stopApp(app, {}, true);
        }),
      );

      logger.info('Stopping tipi...');
      await execAsync('docker compose down --remove-orphans --rmi local');

      return { success: true, message: 'Tipi stopped' };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };

  public start = async () => {
    const spinner = new TerminalSpinner('Starting Tipi...');

    try {
      spinner.start();
      spinner.setMessage('Copying system files...');
      await copySystemFiles();
      spinner.done('System files copied');

      spinner.setMessage('Generating system env file...');
      spinner.start();
      await generateSystemEnvFile();
      spinner.done('System env file generated');

      // Stop and Remove container tipi if exists
      spinner.setMessage('Stopping and removing containers...');
      spinner.start();
      await execAsync('docker rm -f tipi-db');
      await execAsync('docker rm -f tipi-redis');
      await execAsync('docker rm -f dashboard');
      await execAsync('docker rm -f reverse-proxy');
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

      const out = fs.openSync('./logs/watcher.log', 'a');
      const err = fs.openSync('./logs/watcher.log', 'a');

      const subprocess = spawn('./cli', [process.argv[1] as string, 'watch'], { cwd: this.rootFolder, detached: true, stdio: ['ignore', out, err] });
      subprocess.unref();

      spinner.done('Tipi successfully started 🎉');

      return { success: true, message: 'Tipi started' };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };

  public restart = async () => {
    try {
      await this.stop();
      await this.start();
      return { success: true, message: '' };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };
}
