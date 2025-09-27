import { castAppUrn } from '@/common/helpers/app-helpers';
import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AppsService } from './apps.service';
import { GetAppDto, GetComposeDiffDto, GetConfigDiffDto, GetRandomPortDto, GuestAppsDto, MyAppsDto } from './dto/app.dto';
import { ApiResponse } from '@nestjs/swagger';

@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Get('installed')
  @UseGuards(AuthGuard)
  @ApiResponse({ type: MyAppsDto })
  async getInstalledApps() {
    const installed = await this.appsService.getInstalledApps();
    return MyAppsDto.parse({ installed }, { reportOnly: true });
  }

  @Get('guest')
  @ApiResponse({ type: GuestAppsDto })
  async getGuestApps() {
    const guest = await this.appsService.getGuestDashboardApps();
    return GuestAppsDto.parse({ installed: guest }, { reportOnly: true });
  }

  @Post('random-port')
  @UseGuards(AuthGuard)
  @ApiResponse({ type: GetRandomPortDto })
  async getRandomPort() {
    const port = await this.appsService.getRandomPort();
    return GetRandomPortDto.parse({ port }, { reportOnly: true });
  }

  @Get(':urn')
  @UseGuards(AuthGuard)
  @ApiResponse({ type: GetAppDto })
  async getApp(@Param('urn') urn: string) {
    const res = await this.appsService.getApp(castAppUrn(urn));
    return GetAppDto.parse(res, { reportOnly: true });
  }

  @Get(':urn/compose-diff')
  @UseGuards(AuthGuard)
  @ApiResponse({ type: GetComposeDiffDto })
  async getAppComposeDiff(@Param('urn') urn: string) {
    const res = await this.appsService.getAppComposeDiff(castAppUrn(urn));
    return GetComposeDiffDto.parse(res, { reportOnly: true });
  }

  @Get(':urn/config-diff')
  @UseGuards(AuthGuard)
  @ApiResponse({ type: GetConfigDiffDto })
  async getAppConfigDiff(@Param('urn') urn: string) {
    const res = await this.appsService.getAppConfigDiff(castAppUrn(urn));
    return GetConfigDiffDto.parse(res, { reportOnly: true });
  }
}
