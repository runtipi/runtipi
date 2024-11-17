import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AppLifecycleService } from './app-lifecycle.service';
import { AppFormBody, UninstallAppBody, UpdateAppBody, UpdateUserComposeBody, appFormSchema, updateUserComposeSchema } from './dto/app-lifecycle.dto';

@UseGuards(AuthGuard)
@Controller('app-lifecycle')
export class AppLifecycleController {
  constructor(private readonly appLifecycleService: AppLifecycleService) {}

  @Post(':id/install')
  async installApp(@Param('id') id: string, @Body() body: AppFormBody) {
    const form = appFormSchema.parse(body);

    return this.appLifecycleService.installApp({ appId: id, form });
  }

  @Post(':id/start')
  async startApp(@Param('id') id: string) {
    return this.appLifecycleService.startApp({ appId: id });
  }

  @Post(':id/stop')
  async stopApp(@Param('id') id: string) {
    return this.appLifecycleService.stopApp({ appId: id });
  }

  @Post(':id/restart')
  async restartApp(@Param('id') id: string) {
    return this.appLifecycleService.restartApp({ appId: id });
  }

  @Delete(':id/uninstall')
  async uninstallApp(@Param('id') id: string, @Body() body: UninstallAppBody) {
    return this.appLifecycleService.uninstallApp({ appId: id, removeBackups: body.removeBackups });
  }

  @Post(':id/reset')
  async resetApp(@Param('id') id: string) {
    return this.appLifecycleService.resetApp({ appId: id });
  }

  @Patch(':id/update')
  async updateApp(@Param('id') id: string, @Body() body: UpdateAppBody) {
    return this.appLifecycleService.updateApp({ appId: id, performBackup: body.performBackup });
  }

  @Patch('update-all')
  async updateAllApps() {
    return this.appLifecycleService.updateAllApps();
  }

  @Patch(':id/update-config')
  async updateAppConfig(@Param('id') id: string, @Body() body: AppFormBody) {
    const form = appFormSchema.parse(body);

    return this.appLifecycleService.updateAppConfig({ appId: id, form });
  }

  @Patch(':id/update-user-compose')
  async updateUserCompose(@Param('id') id: string, @Body() body: UpdateUserComposeBody) {
    const form = updateUserComposeSchema.parse(body);

    return this.appLifecycleService.updateAppUserCompose({ appId: id, compose: form.compose });
  }
}
