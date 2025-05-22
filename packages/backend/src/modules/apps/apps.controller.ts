import { castAppUrn } from '@/common/helpers/app-helpers';
import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { AppsService } from './apps.service';
import { GetAppDto, GetRandomPortDto, GuestAppsDto, MyAppsDto } from './dto/app.dto';

@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Get('installed')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(MyAppsDto)
  async getInstalledApps(): Promise<MyAppsDto> {
    const installed = await this.appsService.getInstalledApps();
    return { installed };
  }

  @Get('guest')
  @ZodSerializerDto(GuestAppsDto)
  async getGuestApps(): Promise<GuestAppsDto> {
    const guest = await this.appsService.getGuestDashboardApps();
    return { installed: guest };
  }

  @Post('random-port')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(GetRandomPortDto)
  async getRandomPort(): Promise<GetRandomPortDto> {
    const port = await this.appsService.getRandomPort();
    return { port: port };
  }

  @Get(':urn')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(GetAppDto)
  async getApp(@Param('urn') urn: string): Promise<GetAppDto> {
    return this.appsService.getApp(castAppUrn(urn));
  }
}
