import path from 'node:path';
import { DEFAULT_REPO_URL } from '@/common/helpers/env-helpers';
import { execAsync } from '@/common/helpers/exec-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { SocketManager } from '@/core/socket/socket.service';
import { Injectable } from '@nestjs/common';
import { AppFilesManager } from '../apps/app-files-manager';
import type { AppEventFormInput } from '../queue/entities/app-events';
import { ReposService } from '../repos/repos.service';
import { DockerComposeBuilder } from './builders/compose.builder';
import { type Service, type ServiceInput, serviceSchema } from './builders/schemas';
import { ServiceBuilder } from './builders/service.builder';
import { TraefikLabelsBuilder } from './builders/traefik-labels.builder';
import { DockerCommandFactory } from './docker-command.factory';

@Injectable()
export class DockerService {
  dockerCommandFactory: DockerCommandFactory;

  constructor(
    private readonly logger: LoggerService,
    private readonly config: ConfigurationService,
    private readonly appFilesManager: AppFilesManager,
    private readonly repoService: ReposService,
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
    const { appsRepoId, directories } = this.config.getConfig();

    let isCustomConfig = appsRepoId !== this.repoService.getRepoHash(DEFAULT_REPO_URL);

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

    const commonComposeFile = path.join(directories.dataDir, 'repos', appsRepoId, 'apps', 'docker-compose.common.yml');
    args.push(`-f ${commonComposeFile}`);

    // User defined overrides
    const userComposeFile = await this.appFilesManager.getUserComposeFile(appId);
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
   * @param {string} appId - App name
   * @param {string} command - Command to execute
   */
  public composeApp = async (appId: string, command: string) => {
    const { args, isCustomConfig } = await this.getBaseComposeArgsApp(appId);
    args.push(command);

    this.logger.info(`Running docker compose with args ${args.join(' ')}`);
    const { stdout, stderr } = await execAsync(`docker-compose ${args.join(' ')}`);

    if (stderr?.includes('Command failed:')) {
      if (isCustomConfig) {
        throw new Error(
          `Error with your custom app: ${stderr}. Before opening an issue try to remove any user-config files or any custom app-store repo and try again.`,
        );
      }
      throw new Error(stderr);
    }

    return { stdout, stderr };
  };

  public getDockerCompose = (services: ServiceInput[], form: AppEventFormInput) => {
    const myServices = services.map((service) => this.buildService(service, form));

    const dockerCompose = new DockerComposeBuilder().addServices(myServices).addNetwork({
      key: 'tipi_main_network',
      name: 'runtipi_tipi_main_network',
      external: true,
    });

    return dockerCompose.build();
  };

  private buildService = (params: Service, form: AppEventFormInput) => {
    const result = serviceSchema.safeParse(params);

    if (!result.success) {
      console.warn(`! Service ${params.name} has invalid schema: \n${JSON.stringify(result.error.flatten(), null, 2)}\nNotify the app maintainer`);
    }

    const service = new ServiceBuilder();
    service
      .setImage(params.image)
      .setName(params.name)
      .setEnvironment(params.environment)
      .setCommand(params.command)
      .setHealthCheck(params.healthCheck)
      .setDependsOn(params.dependsOn)
      .setVolumes(params.volumes)
      .setRestartPolicy('unless-stopped')
      .setExtraHosts(params.extraHosts)
      .setUlimits(params.ulimits)
      .setPorts(params.addPorts)
      .setNetwork('tipi_main_network')
      .setNetworkMode(params.networkMode)
      .setCapAdd(params.capAdd)
      .setDeploy(params.deploy)
      .setHostname(params.hostname)
      .setDevices(params.devices)
      .setEntrypoint(params.entrypoint)
      .setPid(params.pid)
      .setPrivileged(params.privileged)
      .setTty(params.tty)
      .setUser(params.user)
      .setWorkingDir(params.workingDir)
      .setShmSize(params.shmSize)
      .setCapDrop(params.capDrop)
      .setLogging(params.logging)
      .setReadOnly(params.readOnly)
      .setSecurityOpt(params.securityOpt)
      .setStopSignal(params.stopSignal)
      .setStopGracePeriod(params.stopGracePeriod)
      .setStdinOpen(params.stdinOpen);

    if (params.isMain) {
      if (!params.internalPort) {
        throw new Error('Main service must have an internal port specified');
      }

      if (form.openPort) {
        service.setPort({
          containerPort: params.internalPort,
          hostPort: '${APP_PORT}',
        });
      }

      const traefikLabels = new TraefikLabelsBuilder({
        internalPort: params.internalPort,
        appId: params.name,
        exposedLocal: form.exposedLocal,
        exposed: form.exposed,
      })
        .addExposedLabels()
        .addExposedLocalLabels();

      service.setLabels(traefikLabels.build());
    }

    return service.build();
  };
}
