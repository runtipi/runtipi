import { spawn } from 'node:child_process';
import path from 'node:path';
import { ConfigurationService } from '@/core/config/configuration.service.js';
import { FilesystemService } from '@/core/filesystem/filesystem.service.js';
import { LoggerService } from '@/core/logger/logger.service.js';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import * as Sentry from '@sentry/nestjs';
import { AppFilesManager } from '../apps/app-files-manager.js';

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

    const appEnv = await this.appFilesManager.getAppEnv(appUrn);
    const args: string[] = ['--env-file', appEnv.path];

    // User custom env file
    const userEnvFile = await this.appFilesManager.getUserEnv(appUrn);
    if (userEnvFile.content) {
      isCustomConfig = true;
      args.push('--env-file', userEnvFile.path);
    }

    args.push('--project-name', appUrn.replace(':', '_'));

    const composeFile = await this.appFilesManager.getDockerComposeYaml(appUrn);
    args.push('-f', composeFile.path);

    // User defined overrides
    const userComposeFile = await this.appFilesManager.getUserComposeFile(appUrn);
    if (userComposeFile.content) {
      isCustomConfig = true;
      args.push('--file', userComposeFile.path);
    }

    return { args, isCustomConfig };
  };

  public getBaseComposeArgsRuntipi = async () => {
    const { dataDir } = this.config.get('directories');
    const args: string[] = ['--env-file', path.join(dataDir, '.env')];

    args.push('--project-name', 'runtipi');

    const composeFile = path.join(dataDir, 'docker-compose.yml');
    args.push('-f', composeFile);

    // User defined overrides
    const userComposeFile = path.join(dataDir, 'user-config', 'tipi-compose.yml');
    if (await this.filesystem.pathExists(userComposeFile)) {
      args.push('--file', userComposeFile);
    }

    return { args };
  };

  /**
   * Helpers to execute docker compose commands
   * @param {string} appUrn - App name
   * @param {string} command - Command to execute
   */
  public composeApp = async (appUrn: AppUrn, command: string) => {
    let { args, isCustomConfig } = await this.getBaseComposeArgsApp(appUrn);
    args.push(...command.split(' '));
    args = args.filter(Boolean);

    this.logger.info(`Running docker compose with args ${args.join(' ')}`);

    const cmd = spawn('docker-compose', args);
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await new Promise((resolve) => {
      cmd.stdout.on('data', (data) => {
        this.logger.info(`docker-compose: ${String(data).trim()}`);
        stdout.push(String(data).trim());
      });
      cmd.stderr.on('data', (data) => {
        this.logger.info(`docker-compose: ${String(data).trim()}`);
        stderr.push(String(data).trim());
      });
      cmd.on('close', resolve);
    });

    if (exitCode !== 0) {
      this.logger.info(`Docker-compose exited with code ${exitCode}`);
      if (isCustomConfig) {
        this.logger.warn('User-config detected, please make sure your configuration is correct before opening an issue');
      }
      const error = stderr.pop();
      throw new Error(error);
    }

    return { success: true, stdout: stdout.join(''), stderr: stderr.join('') };
  };

  public getLogsStream = async (maxLines: number, appUrn?: AppUrn) => {
    try {
      const { args } = appUrn ? await this.getBaseComposeArgsApp(appUrn) : await this.getBaseComposeArgsRuntipi();

      args.push('logs', '--follow', '-n', maxLines.toString());

      const logs = spawn('docker-compose', args, { stdio: 'pipe' });

      logs.on('error', () => {
        logs.kill('SIGINT');
      });

      return {
        on: logs.stdout.on.bind(logs.stdout),
        kill: () => logs.kill('SIGINT'),
      };
    } catch (error) {
      this.logger.error(`Error getting log stream: ${error}`);
      Sentry.captureException(error, { tags: { source: 'docker log stream', appUrn } });
      throw new InternalServerErrorException('Error getting log stream');
    }
  };
}
