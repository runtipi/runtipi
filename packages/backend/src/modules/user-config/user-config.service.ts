import { HttpStatus, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppsRepository } from '../apps/apps.repository';
import { TranslatableError } from '@/common/error/translatable-error';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { AppFilesManager } from '../apps/app-files-manager';
import { AppsService } from '../apps/apps.service';
import { UpdateUserConfigDto } from './dto/user-config.dto';

@Injectable()
export class UserConfigService {
  constructor(
    private readonly appFilesManager: AppFilesManager,
    private readonly appsRepository: AppsRepository,
    private readonly appsService: AppsService,
    private readonly filesystem: FilesystemService,
  ) {}

  async getUserConfig(appUrn: AppUrn) {
    const app = await this.appsService.getApp(appUrn);
    const userComposeFile = await this.appFilesManager.getUserComposeFile(appUrn);
    const userEnvFile = await this.appFilesManager.getUserEnv(appUrn);
    const sourceCompose = await this.appFilesManager.getGeneratedDockerComposeYaml(appUrn);

    return {
      dockerCompose: userComposeFile.content || null,
      appEnv: userEnvFile.content || null,
      sourceCompose: sourceCompose.content,
      isEnabled: app.app?.userConfigEnabled ?? true,
    };
  }

  async updateUserConfig(appUrn: AppUrn, updateUserConfigDto: UpdateUserConfigDto) {
    const app = await this.appsRepository.getAppByUrn(appUrn);
    if (!app) throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);

    const userComposeFile = await this.appFilesManager.getUserComposeFile(appUrn);
    const userEnvFile = await this.appFilesManager.getUserEnv(appUrn);
    const composeChanged = (userComposeFile.content ?? '') !== updateUserConfigDto.dockerCompose;
    const envChanged = (userEnvFile.content ?? '') !== updateUserConfigDto.appEnv;
    if (!composeChanged && !envChanged) return;

    // A failed write can still leave partial changes that require a restart.
    if (app.userConfigEnabled) await this.appsRepository.updateAppById(app.id, { pendingRestart: true });

    if (composeChanged && !(await this.filesystem.writeTextFile(userComposeFile.path, updateUserConfigDto.dockerCompose))) {
      throw new Error('Could not save the compose override');
    }
    if (envChanged && !(await this.filesystem.writeTextFile(userEnvFile.path, updateUserConfigDto.appEnv))) {
      throw new Error('Could not save the environment override');
    }
  }

  async enableUserConfig(appUrn: AppUrn): Promise<void> {
    const app = await this.appsRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    await this.appsRepository.updateAppById(app.id, {
      userConfigEnabled: true,
    });
  }

  async disableUserConfig(appUrn: AppUrn) {
    const app = await this.appsRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    await this.appsRepository.updateAppById(app.id, {
      userConfigEnabled: false,
    });
  }
}
