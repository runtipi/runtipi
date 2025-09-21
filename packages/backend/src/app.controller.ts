import { ConfigurationService } from '@/core/config/configuration.service';
import { UserRepository } from '@/modules/user/user.repository';
import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AcknowledgeWelcomeBody, AppContextDto, UserSettingsBody, UserContextDto } from './app.dto';
import { AppService } from './app.service';
import { AppsService } from './modules/apps/apps.service';
import { AuthGuard } from './modules/auth/auth.guard';
import { MarketplaceService } from './modules/marketplace/marketplace.service';
import type { UserDto } from './modules/user/dto/user.dto';
import { ApiResponse } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly userRepository: UserRepository,
    private readonly configuration: ConfigurationService,
    private readonly appsService: AppsService,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  @Get('/user-context')
  @ApiResponse({ type: UserContextDto })
  async userContext(@Req() req: Request) {
    const { guestDashboard, allowAutoThemes, themeColor, themeBase, allowErrorMonitoring, localDomain, sslPort } =
      this.configuration.get('userSettings');
    const version = await this.appService.getVersion();
    const operator = await this.userRepository.getFirstOperator();

    return UserContextDto.parse(
      {
        isLoggedIn: Boolean(req.user),
        isConfigured: Boolean(operator),
        isGuestDashboardEnabled: guestDashboard,
        allowAutoThemes,
        allowErrorMonitoring,
        themeColor,
        themeBase,
        version,
        localDomain,
        sslPort,
      },
      { reportOnly: true },
    );
  }

  @Get('/app-context')
  @UseGuards(AuthGuard)
  @ApiResponse({ type: AppContextDto })
  async appContext(@Req() req: Request) {
    const version = await this.appService.getVersion();

    const { userSettings } = this.configuration.getConfig();

    const apps = await this.marketplaceService.getAvailableApps();

    const installedApps = await this.appsService.getInstalledApps();
    const updatesAvailable = installedApps.filter(({ app, metadata }) => {
      return Number(app.version) < Number(metadata?.latestVersion ?? 0) && app.status !== 'updating';
    });

    return AppContextDto.parse(
      { version, userSettings, user: req.user as UserDto, apps, updatesAvailable: updatesAvailable.length },
      { reportOnly: true },
    );
  }

  @Patch('/user-settings')
  @UseGuards(AuthGuard)
  async updateUserSettings(@Body() body: UserSettingsBody) {
    await this.configuration.setUserSettings(body);
  }

  @Patch('/acknowledge-welcome')
  @UseGuards(AuthGuard)
  async acknowledgeWelcome(@Req() req: Request, @Body() body: AcknowledgeWelcomeBody) {
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
}
