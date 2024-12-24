import { createAppUrn } from '@/common/helpers/app-helpers';
import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AppLifecycleService } from './app-lifecycle.service';
import { AppFormBody, UninstallAppBody, UpdateAppBody, appFormSchema } from './dto/app-lifecycle.dto';

@UseGuards(AuthGuard)
@Controller('app-lifecycle')
export class AppLifecycleController {
  constructor(private readonly appLifecycleService: AppLifecycleService) {}

  @Post(':appstore/:id/install')
  async installApp(@Param('appstore') appstore: string, @Param('id') id: string, @Body() body: AppFormBody) {
    const form = appFormSchema.parse(body);
    const appUrn = createAppUrn(id, appstore);

    return this.appLifecycleService.installApp({ appUrn, form });
  }

  @Post(':appstore/:id/start')
  async startApp(@Param('appstore') appstore: string, @Param('id') id: string) {
    const appUrn = createAppUrn(id, appstore);
    return this.appLifecycleService.startApp({ appUrn });
  }

  @Post(':appstore/:id/stop')
  async stopApp(@Param('appstore') appstore: string, @Param('id') id: string) {
    const appUrn = createAppUrn(id, appstore);
    return this.appLifecycleService.stopApp({ appUrn });
  }

  @Post(':appstore/:id/restart')
  async restartApp(@Param('appstore') appstore: string, @Param('id') id: string) {
    const appUrn = createAppUrn(id, appstore);
    return this.appLifecycleService.restartApp({ appUrn });
  }

  @Delete(':appstore/:id/uninstall')
  async uninstallApp(@Param('appstore') appstore: string, @Param('id') id: string, @Body() body: UninstallAppBody) {
    const appUrn = createAppUrn(id, appstore);
    return this.appLifecycleService.uninstallApp({ appUrn, removeBackups: body.removeBackups });
  }

  @Post(':appstore/:id/reset')
  async resetApp(@Param('appstore') appstore: string, @Param('id') id: string) {
    const appUrn = createAppUrn(id, appstore);
    return this.appLifecycleService.resetApp({ appUrn });
  }

  @Patch(':appstore/:id/update')
  async updateApp(@Param('appstore') appstore: string, @Param('id') id: string, @Body() body: UpdateAppBody) {
    const appUrn = createAppUrn(id, appstore);
    return this.appLifecycleService.updateApp({ appUrn, performBackup: body.performBackup });
  }

  @Patch('update-all')
  async updateAllApps() {
    return this.appLifecycleService.updateAllApps();
  }

  @Patch(':appstore/:id/update-config')
  async updateAppConfig(@Param('appstore') appstore: string, @Param('id') id: string, @Body() body: AppFormBody) {
    const appUrn = createAppUrn(id, appstore);
    const form = appFormSchema.parse(body);

    return this.appLifecycleService.updateAppConfig({ appUrn, form });
  }
}
