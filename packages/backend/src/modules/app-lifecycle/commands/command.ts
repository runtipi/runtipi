import { extractAppId } from '@/common/helpers/app-helpers';
import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { DockerComposeBuilder } from '@/modules/docker/builders/compose.builder';
import { dynamicComposeSchema } from '@/modules/docker/builders/schemas';
import { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import * as Sentry from '@sentry/nestjs';

export class AppLifecycleCommand {
  constructor(
    protected logger: LoggerService,
    protected appFilesManager: AppFilesManager,
    protected dockerService: DockerService,
    protected marketplaceService: MarketplaceService,
    protected dockerComposeBuilder: DockerComposeBuilder,
  ) {}

  protected async ensureAppDir(appId: string, form: AppEventFormInput): Promise<void> {
    const composeYaml = await this.appFilesManager.getDockerComposeYaml(appId);

    if (!composeYaml.content) {
      await this.marketplaceService.copyAppFromRepoToInstalled(appId);
    }

    const appInfo = await this.appFilesManager.getInstalledAppInfo(appId);
    const composeJson = await this.appFilesManager.getDockerComposeJson(appId);

    if (composeJson.content && appInfo?.dynamic_config) {
      try {
        const { services } = dynamicComposeSchema.parse(composeJson.content);
        const { storeId } = extractAppId(appId);
        const composeFile = this.dockerComposeBuilder.getDockerCompose(services, form, storeId);

        await this.appFilesManager.writeDockerComposeYml(appId, composeFile);
      } catch (err) {
        this.logger.error(`Error generating docker-compose.yml file for app ${appId}. Falling back to default docker-compose.yml`);
        this.logger.error(err);
        Sentry.captureException(err, {
          tags: { appId, event: 'ensure_app_dir' },
        });
      }
    }

    // Set permissions
    await this.appFilesManager.setAppDataDirPermissions(appId);
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
