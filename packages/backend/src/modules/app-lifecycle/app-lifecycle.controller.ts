import { castAppUrn } from '@/common/helpers/app-helpers';
import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { AppLifecycleService } from './app-lifecycle.service';
import { AppFormBody, LifecycleRequestDto, UninstallAppBody, UpdateAppBody, appFormSchema } from './dto/app-lifecycle.dto';

@UseGuards(AuthGuard)
@Controller('app-lifecycle')
export class AppLifecycleController {
  constructor(private readonly appLifecycleService: AppLifecycleService) {}

  @Post(':urn/install')
  @ZodSerializerDto(LifecycleRequestDto)
  async installApp(@Param('urn') urn: string, @Body() body: AppFormBody): Promise<LifecycleRequestDto> {
    const form = appFormSchema.parse(body);

    return this.appLifecycleService.installApp({ appUrn: castAppUrn(urn), form });
  }

  @Post(':urn/start')
  @ZodSerializerDto(LifecycleRequestDto)
  async startApp(@Param('urn') urn: string): Promise<LifecycleRequestDto> {
    return this.appLifecycleService.startApp({ appUrn: castAppUrn(urn) });
  }

  @Post(':urn/stop')
  @ZodSerializerDto(LifecycleRequestDto)
  async stopApp(@Param('urn') urn: string): Promise<LifecycleRequestDto> {
    return this.appLifecycleService.stopApp({ appUrn: castAppUrn(urn) });
  }

  @Post(':urn/restart')
  @ZodSerializerDto(LifecycleRequestDto)
  async restartApp(@Param('urn') urn: string): Promise<LifecycleRequestDto> {
    return this.appLifecycleService.restartApp({ appUrn: castAppUrn(urn) });
  }

  @Delete(':urn/uninstall')
  @ZodSerializerDto(LifecycleRequestDto)
  async uninstallApp(@Param('urn') urn: string, @Body() body: UninstallAppBody): Promise<LifecycleRequestDto> {
    return this.appLifecycleService.uninstallApp({ appUrn: castAppUrn(urn), removeBackups: body.removeBackups });
  }

  @Post(':urn/reset')
  @ZodSerializerDto(LifecycleRequestDto)
  async resetApp(@Param('urn') urn: string): Promise<LifecycleRequestDto> {
    return this.appLifecycleService.resetApp({ appUrn: castAppUrn(urn) });
  }

  @Patch(':urn/update')
  @ZodSerializerDto(LifecycleRequestDto)
  async updateApp(@Param('urn') urn: string, @Body() body: UpdateAppBody): Promise<LifecycleRequestDto> {
    return this.appLifecycleService.updateApp({ appUrn: castAppUrn(urn), performBackup: body.performBackup });
  }

  @Patch(':urn/update-config')
  @ZodSerializerDto(LifecycleRequestDto)
  async updateAppConfig(@Param('urn') urn: string, @Body() body: AppFormBody): Promise<LifecycleRequestDto> {
    return this.appLifecycleService.updateAppConfig({ appUrn: castAppUrn(urn), form: body });
  }

  @Patch('update-all')
  async updateAllApps() {
    return this.appLifecycleService.updateAllApps();
  }
}
