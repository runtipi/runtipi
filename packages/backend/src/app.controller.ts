import { ConfigurationService } from '@/core/config/configuration.service';
import { UserRepository } from '@/modules/user/user.repository';
import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { AcknowledgeWelcomeBody, AppContextDto, PartialUserSettingsDto, UserContextDto } from './app.dto';
import { AppService } from './app.service';
import { AppCatalogService } from './modules/apps/app-catalog.service';
import { AuthGuard } from './modules/auth/auth.guard';
import type { UserDto } from './modules/user/dto/user.dto';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly userRepository: UserRepository,
    private readonly configuration: ConfigurationService,
    private readonly appCatalog: AppCatalogService,
  ) {}

  @Get('/user-context')
  @ZodSerializerDto(UserContextDto)
  async userContext(@Req() req: Request): Promise<UserContextDto> {
    const { guestDashboard, allowAutoThemes, allowErrorMonitoring } = this.configuration.get('userSettings');
    const version = await this.appService.getVersion();
    const operator = await this.userRepository.getFirstOperator();

    return {
      isLoggedIn: Boolean(req.user),
      isConfigured: Boolean(operator),
      isGuestDashboardEnabled: guestDashboard,
      allowAutoThemes,
      allowErrorMonitoring,
      version,
    };
  }

  @Get('/app-context')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(AppContextDto)
  async appContext(@Req() req: Request): Promise<AppContextDto> {
    const version = await this.appService.getVersion();

    const { userSettings } = this.configuration.getConfig();

    const apps = await this.appCatalog.getAvailableApps();

    const installedApps = await this.appCatalog.getInstalledApps();

    const updatesAvailable = installedApps.filter(({ app, updateInfo }) => {
      return Number(app.version) < Number(updateInfo.latestVersion) && app.status !== 'updating';
    });

    return { version, userSettings, user: req.user as UserDto, apps, updatesAvailable: updatesAvailable.length };
  }

  @Patch('/user-settings')
  @UseGuards(AuthGuard)
  async updateUserSettings(@Body() body: PartialUserSettingsDto): Promise<void> {
    await this.configuration.setUserSettings(body);
  }

  @Patch('/acknowledge-welcome')
  @UseGuards(AuthGuard)
  async acknowledgeWelcome(@Req() req: Request, @Body() body: AcknowledgeWelcomeBody): Promise<void> {
    if (!req.user) {
      return;
    }

    const version = await this.appService.getVersion();
    this.configuration.initSentry({ release: version.current, allowSentry: body.allowErrorMonitoring });
    await this.userRepository.updateUser(req.user.id, { hasSeenWelcome: true });

    if (this.configuration.get('demoMode')) {
      return;
    }

    await this.configuration.setUserSettings({ allowErrorMonitoring: body.allowErrorMonitoring });
  }

  @Get('/debug-sentry')
  getError() {
    throw new Error('This is a test error from the server');
  }
}
