import { castAppUrn } from '@/common/helpers/app-helpers';
import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AppLifecycleService } from './app-lifecycle.service';
import { AppFormBody, LifecycleRequestDto, UninstallAppBody, UpdateAppBody } from './dto/app-lifecycle.dto';
import { ApiResponse } from '@nestjs/swagger';

@UseGuards(AuthGuard)
@Controller('app-lifecycle')
export class AppLifecycleController {
  constructor(private readonly appLifecycleService: AppLifecycleService) {}

  @Post(':urn/install')
  @ApiResponse({ type: LifecycleRequestDto })
  async installApp(@Param('urn') urn: string, @Body() body: AppFormBody) {
    const res = await this.appLifecycleService.installApp({ appUrn: castAppUrn(urn), form: body });
    return LifecycleRequestDto.parse(res, { reportOnly: true });
  }

  @Post(':urn/start')
  @ApiResponse({ type: LifecycleRequestDto })
  async startApp(@Param('urn') urn: string) {
    const res = await this.appLifecycleService.startApp({ appUrn: castAppUrn(urn) });
    return LifecycleRequestDto.parse(res, { reportOnly: true });
  }

  @Post(':urn/stop')
  @ApiResponse({ type: LifecycleRequestDto })
  async stopApp(@Param('urn') urn: string) {
    const res = await this.appLifecycleService.stopApp({ appUrn: castAppUrn(urn) });
    return LifecycleRequestDto.parse(res, { reportOnly: true });
  }

  @Post(':urn/restart')
  @ApiResponse({ type: LifecycleRequestDto })
  async restartApp(@Param('urn') urn: string) {
    const res = await this.appLifecycleService.restartApp({ appUrn: castAppUrn(urn) });
    return LifecycleRequestDto.parse(res, { reportOnly: true });
  }

  @Delete(':urn/uninstall')
  @ApiResponse({ type: LifecycleRequestDto })
  async uninstallApp(@Param('urn') urn: string, @Body() body: UninstallAppBody) {
    const res = await this.appLifecycleService.uninstallApp({ appUrn: castAppUrn(urn), removeBackups: body.removeBackups });
    return LifecycleRequestDto.parse(res, { reportOnly: true });
  }

  @Post(':urn/reset')
  @ApiResponse({ type: LifecycleRequestDto })
  async resetApp(@Param('urn') urn: string) {
    const res = await this.appLifecycleService.resetApp({ appUrn: castAppUrn(urn) });
    return LifecycleRequestDto.parse(res, { reportOnly: true });
  }

  @Patch(':urn/update')
  @ApiResponse({ type: LifecycleRequestDto })
  async updateApp(@Param('urn') urn: string, @Body() body: UpdateAppBody) {
    const res = await this.appLifecycleService.updateApp({ appUrn: castAppUrn(urn), performBackup: body.performBackup });
    return LifecycleRequestDto.parse(res, { reportOnly: true });
  }

  @Patch(':urn/update-config')
  @ApiResponse({ type: LifecycleRequestDto })
  async updateAppSettings(@Param('urn') urn: string, @Body() body: AppFormBody) {
    const res = await this.appLifecycleService.updateAppSettings({ appUrn: castAppUrn(urn), form: body });
    return LifecycleRequestDto.parse(res, { reportOnly: true });
  }

  @Patch('update-all')
  async updateAllApps() {
    return this.appLifecycleService.updateAllApps();
  }

  @Post('start-all')
  async startAllApps() {
    return this.appLifecycleService.startAllApps();
  }

  @Post('stop-all')
  async stopAllApps() {
    return this.appLifecycleService.stopAllApps();
  }

  @Post('restart-all')
  async restartAllApps() {
    return this.appLifecycleService.restartAllApps();
  }
}
