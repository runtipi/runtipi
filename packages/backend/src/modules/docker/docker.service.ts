import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { effectiveComposeSchema, type EffectiveAppServices } from './compose-config';
import type { AppUrn } from '@runtipi/common/types';
import * as Sentry from '@sentry/nestjs';
import { AppFilesManager, type AppMigration } from '../apps/app-files-manager';
import { AppsService } from '../apps/apps.service';
import type Dockerode from 'dockerode';
import { DOCKERODE } from './docker.constants';

@Injectable()
export class DockerService {
  constructor(
    private readonly logger: LoggerService,
    private readonly config: ConfigurationService,
    private readonly appFilesManager: AppFilesManager,
    private readonly filesystem: FilesystemService,
    private readonly appsService: AppsService,
    @Inject(DOCKERODE) private readonly docker: Dockerode,
  ) {}

  private async getComposeEnvironment(appUrn: AppUrn) {
    let isCustomConfig = false;

    const appEnv = await this.appFilesManager.getAppEnv(appUrn);
    const args: string[] = ['--env-file', appEnv.path];

    const { app } = await this.appsService.getApp(appUrn);
    const userConfigEnabled = app?.userConfigEnabled ?? true;

    // User custom env file
    const userEnvFile = await this.appFilesManager.getUserEnv(appUrn);
    if (userEnvFile.content && userConfigEnabled) {
      isCustomConfig = true;
      args.push('--env-file', userEnvFile.path);
    }

    return { args, isCustomConfig, userConfigEnabled };
  }

  public getBaseComposeArgsApp = async (appUrn: AppUrn) => {
    const { args, isCustomConfig: customEnvironment, userConfigEnabled } = await this.getComposeEnvironment(appUrn);
    let isCustomConfig = customEnvironment;
    args.push('--project-name', appUrn.replace(':', '_'));

    const composeFile = await this.appFilesManager.getGeneratedDockerComposeYaml(appUrn);
    args.push('-f', composeFile.path);

    // User defined overrides
    const userComposeFile = await this.appFilesManager.getUserComposeFile(appUrn);
    if (userComposeFile.content && userConfigEnabled) {
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
    if (await this.filesystem.isFile(userComposeFile)) {
      args.push('--file', userComposeFile);
    }

    return { args };
  };

  /**
   * Helpers to execute docker compose commands
   * @param {string} appUrn - App name
   * @param {string} command - Command to execute
   */
  public async composeApp(appUrn: AppUrn, command: string) {
    const { args, isCustomConfig } = await this.getBaseComposeArgsApp(appUrn);
    return this.runCompose([...args, ...command.split(' ').filter(Boolean)], isCustomConfig);
  }

  public async composeMigration(appUrn: AppUrn, migration: AppMigration, command: string) {
    const { args, isCustomConfig } = await this.getComposeEnvironment(appUrn);
    args.push('--project-name', this.getMigrationProjectName(appUrn), '--file', migration.path);

    return this.runCompose([...args, ...command.split(' ').filter(Boolean)], isCustomConfig, { ...process.env, COMPOSE_PROFILES: '' });
  }

  private getMigrationProjectName(appUrn: AppUrn) {
    return `runtipi-migration-${createHash('sha256').update(appUrn).digest('hex').slice(0, 16)}`;
  }

  public async stopAppMigrations(appUrn: AppUrn) {
    const filters = { label: [`com.docker.compose.project=${this.getMigrationProjectName(appUrn)}`] };
    const containers = await this.docker.listContainers({ all: true, filters });

    for (const container of containers) {
      await this.docker
        .getContainer(container.Id)
        .remove({ force: true })
        .catch((error: { statusCode?: number }) => {
          if (error.statusCode !== 404) throw error;
        });
    }

    try {
      const networks = await this.docker.listNetworks({ filters });
      for (const network of networks) {
        await this.docker
          .getNetwork(network.Id)
          .remove()
          .catch((error: { statusCode?: number }) => {
            if (error.statusCode !== 404) throw error;
          });
      }
    } catch (error) {
      this.logger.warn(`Failed to clean migration networks for ${appUrn}:`, error);
    }
  }

  private async runCompose(args: string[], isCustomConfig: boolean, environment = process.env) {
    this.logger.info(`Running docker compose with args ${args.join(' ')}`);

    const cmd = spawn('docker-compose', args, { env: environment });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    const exitCode = await new Promise((resolve, reject) => {
      cmd.stdout.on('data', (data) => {
        if (!args.includes('config')) this.logger.debug(`docker-compose: ${String(data).trim()}`);
        const chunk = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        stdout.push(chunk);
      });
      cmd.stderr.on('data', (data) => {
        this.logger.debug(`docker-compose: ${String(data).trim()}`);
        const chunk = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        stderr.push(chunk);
      });
      cmd.on('close', resolve);
      cmd.on('error', reject);
    });

    const stdoutText = Buffer.concat(stdout).toString();
    const stderrText = Buffer.concat(stderr).toString();

    if (exitCode !== 0) {
      this.logger.info(`Docker-compose exited with code ${exitCode}`);
      if (isCustomConfig) {
        this.logger.warn('User-config detected, please make sure your configuration is correct before opening an issue');
      }
      throw new Error(stderrText.trim());
    }

    return { success: true, stdout: stdoutText, stderr: stderrText };
  }

  public async getEffectiveAppServices(appUrn: AppUrn): Promise<EffectiveAppServices> {
    const result = await this.composeApp(appUrn, 'config --format json');

    return effectiveComposeSchema.assert(JSON.parse(result.stdout)).services;
  }

  public async getEffectiveMigrationServices(appUrn: AppUrn, migration: AppMigration): Promise<EffectiveAppServices> {
    const result = await this.composeMigration(appUrn, migration, 'config --format json');

    return effectiveComposeSchema.assert(JSON.parse(result.stdout)).services;
  }

  public async getAppRuntime(appUrn: AppUrn) {
    const containers = await this.docker.listContainers({
      all: true,
      filters: { label: [`com.docker.compose.project=${appUrn.replace(':', '_')}`] },
    });

    return Promise.all(
      containers.map(async (container) => {
        const inspected = await this.docker.getContainer(container.Id).inspect();

        return {
          name: inspected.Name.replace(/^\//, ''),
          service: container.Labels['com.docker.compose.service'],
          state: inspected.State.Status,
          health: inspected.State.Health?.Status ?? null,
          restartCount: inspected.RestartCount,
          exitCode: inspected.State.ExitCode,
          startedAt: inspected.State.StartedAt,
          ports: container.Ports.map(({ IP, PrivatePort, PublicPort, Type }) => ({
            hostIp: IP,
            containerPort: PrivatePort,
            hostPort: PublicPort,
            protocol: Type,
          })),
        };
      }),
    );
  }

  public async getLogsSnapshot(maxLines: number, appUrn?: AppUrn) {
    const { args } = appUrn ? await this.getBaseComposeArgsApp(appUrn) : await this.getBaseComposeArgsRuntipi();
    args.push('logs', '--no-color', '--timestamps', '--tail', String(maxLines));

    return new Promise<{ text: string; truncated: boolean }>((resolve, reject) => {
      const child = spawn('docker-compose', args, { stdio: 'pipe' });
      const chunks: Buffer[] = [];
      let bytes = 0;
      let truncated = false;
      const maximum = 256 * 1024;
      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('Log snapshot timed out'));
      }, 10000);

      const append = (data: Buffer) => {
        const remaining = maximum - bytes;
        if (remaining > 0) {
          chunks.push(data.subarray(0, remaining));
          bytes += Math.min(data.length, remaining);
        }
        if (data.length > remaining) {
          truncated = true;
          child.kill('SIGTERM');
        }
      };

      child.stdout.on('data', append);
      child.stderr.on('data', append);
      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 0 && !truncated) {
          reject(new Error('Unable to read logs'));
          return;
        }
        resolve({ text: Buffer.concat(chunks).toString('utf8'), truncated });
      });
    });
  }

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
      this.logger.error('Error getting log stream', error);
      Sentry.captureException(error, { tags: { source: 'docker log stream', appUrn } });
      throw new InternalServerErrorException('Error getting log stream');
    }
  };
}
