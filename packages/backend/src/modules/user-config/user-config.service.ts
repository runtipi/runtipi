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

    return {
      dockerCompose: userComposeFile.content || null,
      appEnv: userEnvFile.content || null,
      isEnabled: app.app?.userConfigEnabled || true,
    };
  }

  async updateUserConfig(appUrn: AppUrn, updateUserConfigDto: UpdateUserConfigDto) {
    const userComposeFile = await this.appFilesManager.getUserComposeFile(appUrn);
    await this.filesystem.writeTextFile(userComposeFile.path, updateUserConfigDto.dockerCompose);

    const userEnvFile = await this.appFilesManager.getUserEnv(appUrn);
    await this.filesystem.writeTextFile(userEnvFile.path, updateUserConfigDto.appEnv);
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
