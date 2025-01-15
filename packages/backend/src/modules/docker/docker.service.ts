import { spawn } from 'node:child_process';
import path from 'node:path';
import { extractAppUrn } from '@/common/helpers/app-helpers';
import { execAsync } from '@/common/helpers/exec-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import type { AppUrn } from '@/types/app/app.types';
import { Injectable } from '@nestjs/common';
import { AppFilesManager } from '../apps/app-files-manager';

@Injectable()
export class DockerService {
  constructor(
    private readonly logger: LoggerService,
    private readonly config: ConfigurationService,
    private readonly appFilesManager: AppFilesManager,
    private readonly filesystem: FilesystemService,
  ) {}

  /**
   * Get the base compose args for an app
   * @param {string} appUrn - App name
   */
  public getBaseComposeArgsApp = async (appUrn: AppUrn) => {
    let isCustomConfig = false;
    const { directories } = this.config.getConfig();

    const { appStoreId } = extractAppUrn(appUrn);

    const appEnv = await this.appFilesManager.getAppEnv(appUrn);
    const args: string[] = [`--env-file ${appEnv.path}`];

    // User custom env file
    const userEnvFile = await this.appFilesManager.getUserEnv(appUrn);
    if (userEnvFile.content) {
      isCustomConfig = true;
      args.push(`--env-file ${userEnvFile.path}`);
    }

    args.push(`--project-name ${appUrn.replace(':', '_')}`);

    const composeFile = await this.appFilesManager.getDockerComposeYaml(appUrn);
    args.push(`-f ${composeFile.path}`);

    const commonComposeFile = path.join(directories.dataDir, 'repos', appStoreId, 'apps', 'docker-compose.common.yml');
    args.push(`-f ${commonComposeFile}`);

    // User defined overrides
    const userComposeFile = await this.appFilesManager.getUserComposeFile(appUrn);
    if (userComposeFile.content) {
      isCustomConfig = true;
      args.push(`--file ${userComposeFile.path}`);
    }

    return { args, isCustomConfig };
  };

  public getBaseComposeArgsRuntipi = async () => {
    const { dataDir } = this.config.get('directories');
    const args: string[] = [`--env-file ${path.join(dataDir, '.env')}`];

    args.push('--project-name runtipi');

    const composeFile = path.join(dataDir, 'docker-compose.yml');
    args.push(`-f ${composeFile}`);

    // User defined overrides
    const userComposeFile = path.join(dataDir, 'user-config', 'tipi-compose.yml');
    if (await this.filesystem.pathExists(userComposeFile)) {
      args.push(`--file ${userComposeFile}`);
    }

    return args;
  };

  /**
   * Helpers to execute docker compose commands
   * @param {string} appUrn - App name
   * @param {string} command - Command to execute
   */
  public composeApp = async (appUrn: AppUrn, command: string) => {
    const { args, isCustomConfig } = await this.getBaseComposeArgsApp(appUrn);
    args.push(command);

    this.logger.info(`Running docker compose with args ${args.join(' ')}`);
    const { stdout, stderr } = await execAsync(`docker-compose ${args.join(' ')}`);

    if (stderr?.includes('Command failed:')) {
      if (isCustomConfig) {
        throw new Error(`Error with your custom app: ${stderr}`);
      }

      throw new Error(stderr);
    }

    return { stdout, stderr };
  };

  public getAppLogs = async (appUrn: AppUrn, maxLines = 300) => {
    const { args } = await this.getBaseComposeArgsApp(appUrn);

    args.push(`logs --follow -n ${maxLines}`);

    const logsCommand = `docker-compose ${args.join(' ')}`;

    const logs = spawn('sh', ['-c', logsCommand]);

    logs.on('error', () => {
      logs.kill('SIGINT');
    });

    return {
      on: logs.stdout.on.bind(logs.stdout),
      kill: () => logs.kill('SIGINT'),
    };
  };

  public getRuntipiLogs = async (maxLines = 300) => {
    const args = await this.getBaseComposeArgsRuntipi();

    args.push(`logs --follow -n ${maxLines || 25}`);

    const logsCommand = `docker-compose ${args.join(' ')}`;

    const logs = spawn('sh', ['-c', logsCommand]);

    logs.on('error', () => {
      logs.kill('SIGINT');
    });

    return {
      on: logs.stdout.on.bind(logs.stdout),
      kill: () => logs.kill('SIGINT'),
    };
  };
}
