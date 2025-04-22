import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { DockerComposeBuilder } from '@/modules/docker/builders/compose.builder';
import { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import type { AppUrn } from '@/types/app/app.types';
import { dynamicComposeSchema } from '@runtipi/common/schemas';
import * as Sentry from '@sentry/nestjs';

export class AppLifecycleCommand {
  constructor(
    protected logger: LoggerService,
    protected appFilesManager: AppFilesManager,
    protected dockerService: DockerService,
    protected marketplaceService: MarketplaceService,
  ) {}

  protected async ensureAppDir(appUrn: AppUrn, form: AppEventFormInput): Promise<void> {
    const composeJson = await this.appFilesManager.getDockerComposeJson(appUrn);

    if (!composeJson.content) {
      await this.marketplaceService.copyAppFromRepoToInstalled(appUrn);
    }

    try {
      const { services } = dynamicComposeSchema.parse(composeJson.content);
      const dockerComposeBuilder = new DockerComposeBuilder();
      const composeFile = dockerComposeBuilder.getDockerCompose(services, form, appUrn);

      await this.appFilesManager.writeDockerComposeYml(appUrn, composeFile);
    } catch (err) {
      this.logger.error(`Error generating docker-compose.yml file for app ${appUrn}`);
      this.logger.error(err);
      Sentry.captureException(err, {
        tags: { appId: appUrn, event: 'ensure_app_dir' },
      });
      throw new Error(`Error generating docker-compose.yml file for app ${appUrn}. Falling back to static yml file.`);
    }

    // Set permissions
    await this.appFilesManager.setAppDataDirPermissions(appUrn);
  }

  protected handleAppError = async (err: unknown, appId: string, event: string): Promise<{ success: false; message: string }> => {
    Sentry.captureException(err, {
      tags: { appId, event },
    });

    if (err instanceof Error) {
      return { success: false, message: err.message };
    }

    return { success: false, message: `An error occurred: ${String(err)}` };
  };
}
