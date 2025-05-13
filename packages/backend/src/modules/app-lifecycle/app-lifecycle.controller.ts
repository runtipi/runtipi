import { castAppUrn } from '@/common/helpers/app-helpers.js';
import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AppLifecycleService } from './app-lifecycle.service.js';
import { AppFormBody, UninstallAppBody, UpdateAppBody, appFormSchema } from './dto/app-lifecycle.dto.js';

@UseGuards(AuthGuard)
@Controller('app-lifecycle')
export class AppLifecycleController {
  constructor(private readonly appLifecycleService: AppLifecycleService) {}

  @Post(':urn/install')
  async installApp(@Param('urn') urn: string, @Body() body: AppFormBody) {
    const form = appFormSchema.parse(body);

    return this.appLifecycleService.installApp({ appUrn: castAppUrn(urn), form });
  }

  @Post(':urn/start')
  async startApp(@Param('urn') urn: string) {
    return this.appLifecycleService.startApp({ appUrn: castAppUrn(urn) });
  }

  @Post(':urn/stop')
  async stopApp(@Param('urn') urn: string) {
    return this.appLifecycleService.stopApp({ appUrn: castAppUrn(urn) });
  }

  @Post(':urn/restart')
  async restartApp(@Param('urn') urn: string) {
    return this.appLifecycleService.restartApp({ appUrn: castAppUrn(urn) });
  }

  @Delete(':urn/uninstall')
  async uninstallApp(@Param('urn') urn: string, @Body() body: UninstallAppBody) {
    return this.appLifecycleService.uninstallApp({ appUrn: castAppUrn(urn), removeBackups: body.removeBackups });
  }

  @Post(':urn/reset')
  async resetApp(@Param('urn') urn: string) {
    return this.appLifecycleService.resetApp({ appUrn: castAppUrn(urn) });
  }

  @Patch(':urn/update')
  async updateApp(@Param('urn') urn: string, @Body() body: UpdateAppBody) {
    return this.appLifecycleService.updateApp({ appUrn: castAppUrn(urn), performBackup: body.performBackup });
  }

  @Patch(':urn/update-config')
  async updateAppConfig(@Param('urn') urn: string, @Body() body: AppFormBody) {
    return this.appLifecycleService.updateAppConfig({ appUrn: castAppUrn(urn), form: body });
  }

  @Patch('update-all')
  async updateAllApps() {
    return this.appLifecycleService.updateAllApps();
  }
}
