import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { DockerComposeBuilder } from '@/modules/docker/builders/compose.builder';
import { SubnetManagerService } from '@/modules/network/subnet-manager.service';
import { AppFileSystemService } from '@/modules/apps/app-file-system.service';
import { AppSourceFactory } from '@/modules/apps/sources/app-source.factory';
import { StoreAppSource } from '@/modules/apps/sources/store-app-source';
import { AppHelpers } from '@/modules/apps/app.helpers';
import { EnvUtils } from '@/modules/env/env.utils';
import { Injectable, Inject } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import Dockerode from 'dockerode';
import { DOCKERODE } from '@/modules/docker/docker.module';

@Injectable()
export class AppInstallationService {
  constructor(
    private readonly appSourceFactory: AppSourceFactory,
    private readonly appFileSystem: AppFileSystemService,
    private readonly appHelpers: AppHelpers,
    private readonly appFilesManager: AppFilesManager,
    private readonly envUtils: EnvUtils,
    private readonly logger: LoggerService,
    private readonly configuration: ConfigurationService,
    private readonly subnetManager: SubnetManagerService,
    @Inject(DOCKERODE) private readonly docker: Dockerode,
  ) {}

  /**
   * Harmonized app installation/update preparation process.
   * This covers:
   * 1. Fetching source and metadata
   * 2. Copying files to the installation folder
   * 3. Generating the environment file
   * 4. Preparing the app-data directory (templates rendering)
   * 5. Generating the final docker-compose.generated.yml
   * 6. Setting permissions
   */
  async prepareInstallation(appUrn: AppUrn, form: AppEventFormInput): Promise<void> {
    const source = this.appSourceFactory.getSource(appUrn);

    this.logger.info(`Preparing installation for app ${appUrn}`);

    if (process.getuid && process.getgid) {
      this.logger.info(`Installing app as User ID: ${process.getuid()}, Group ID: ${process.getgid()}`);
    }

    // 1. Copy app from source to installed (only for non-custom apps)
    // Custom apps are already in their "installed" folder
    if (source instanceof StoreAppSource) {
      await this.appFileSystem.copyAppFromRepoToInstalled(appUrn);
    }

    // 2. Generate app.env
    // This reads config.json from the installed folder (which we just populated or already existed)
    await this.appHelpers.generateEnvFile(appUrn, form);

    // 3. Prepare data directory (templating)
    const appEnv = await this.appFilesManager.getAppEnv(appUrn);
    const envMap = this.envUtils.envStringToMap(appEnv.content);
    await this.appFileSystem.prepareAppDataDir(appUrn, envMap);

    // 4. Generate docker-compose.generated.yml
    await this.generateComposeFile(appUrn, form);

    // 5. Set permissions
    await this.appFilesManager.setAppDataDirPermissions(appUrn);
  }

  public async generateComposeFile(appUrn: AppUrn, form: AppEventFormInput): Promise<void> {
    const source = this.appSourceFactory.getSource(appUrn);
    const composeContent = await source.getCompose();

    if (!composeContent) {
      throw new Error(`Failed to retrieve docker-compose.yml for app ${appUrn}`);
    }

    // Prune existing containers for this app to avoid naming conflicts
    await this.docker.pruneContainers({ filters: { label: [`runtipi.appurn=${appUrn}`] } }).catch((err) => {
      this.logger.warn(`Failed to prune prior containers for ${appUrn}: ${err.message}`);
    });

    const architecture = this.configuration.get('architecture');
    const dockerComposeBuilder = new DockerComposeBuilder();
    const subnet = await this.subnetManager.allocateSubnet(appUrn);

    const composeFile = dockerComposeBuilder.getDockerCompose(composeContent, form, appUrn, subnet, architecture);

    await this.appFilesManager.writeDockerComposeYml(appUrn, composeFile);
  }
}
