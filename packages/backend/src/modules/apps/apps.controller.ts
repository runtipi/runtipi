import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { AppsService } from './apps.service';
import { GetAppDto, GuestAppsDto, MyAppsDto } from './dto/app.dto';

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

  @Get(':id')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(GetAppDto)
  async getApp(@Param('id') id: string): Promise<GetAppDto> {
    return this.appsService.getApp(id);
  }
}
