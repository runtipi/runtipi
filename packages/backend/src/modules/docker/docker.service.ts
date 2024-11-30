import path from 'node:path';
import { extractAppId } from '@/common/helpers/app-helpers';
import { execAsync } from '@/common/helpers/exec-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { SocketManager } from '@/core/socket/socket.service';
import { Injectable } from '@nestjs/common';
import { AppFilesManager } from '../apps/app-files-manager';
import { DockerCommandFactory } from './docker-command.factory';

@Injectable()
export class DockerService {
  dockerCommandFactory: DockerCommandFactory;

  constructor(
    private readonly logger: LoggerService,
    private readonly config: ConfigurationService,
    private readonly appFilesManager: AppFilesManager,
    private readonly socketManager: SocketManager,
    private readonly filesystem: FilesystemService,
  ) {
    this.dockerCommandFactory = new DockerCommandFactory(this);

    const io = this.socketManager.init();

    io.on('connection', async (socket) => {
      socket.onAny((event, body) => {
        const command = this.dockerCommandFactory.createCommand(event);

        if (command) {
          command.execute(socket, body, this.socketManager.emit.bind(this.socketManager));
        }
      });
    });
  }

  /**
   * Get the base compose args for an app
   * @param {string} appId - App name
   */
  public getBaseComposeArgsApp = async (appId: string) => {
    const { directories } = this.config.getConfig();

    const { storeId } = extractAppId(appId);

    const appEnv = await this.appFilesManager.getAppEnv(appId);
    const args: string[] = [`--env-file ${appEnv.path}`];

    // User custom env file
    const userEnvFile = await this.appFilesManager.getUserEnv(appId);
    if (userEnvFile.content) {
      args.push(`--env-file ${userEnvFile.path}`);
    }

    args.push(`--project-name ${appId}`);

    const composeFile = await this.appFilesManager.getDockerComposeYaml(appId);
    args.push(`-f ${composeFile.path}`);

    const commonComposeFile = path.join(directories.dataDir, 'repos', storeId, 'apps', 'docker-compose.common.yml');
    args.push(`-f ${commonComposeFile}`);

    // User defined overrides
    const userComposeFile = await this.appFilesManager.getUserComposeFile(appId);
    if (userComposeFile.content) {
      args.push(`--file ${userComposeFile.path}`);
    }

    return { args };
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
   * @param {string} appId - App name
   * @param {string} command - Command to execute
   */
  public composeApp = async (appId: string, command: string) => {
    const { args } = await this.getBaseComposeArgsApp(appId);
    args.push(command);

    this.logger.info(`Running docker compose with args ${args.join(' ')}`);
    const { stdout, stderr } = await execAsync(`docker-compose ${args.join(' ')}`);

    if (stderr?.includes('Command failed:')) {
      throw new Error(stderr);
    }

    return { stdout, stderr };
  };
}
