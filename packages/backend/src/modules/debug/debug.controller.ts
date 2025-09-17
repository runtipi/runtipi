import { Controller, Post, UseGuards } from '@nestjs/common';
import { DebugService } from './debug.service';
import { AuthGuard } from '../auth/auth.guard';
import { DebugGuard } from './debug.guard';

@Controller('debug')
export class DebugController {
  constructor(private readonly debugService: DebugService) {}

  @UseGuards(AuthGuard)
  @UseGuards(DebugGuard)
  @Post('seed')
  async seedDatabase() {
    return this.debugService.seedDatabase();
  }

  @UseGuards(AuthGuard)
  @UseGuards(DebugGuard)
  @Post('set-all-app-update-available')
  async setAllAppUpdateAvailable() {
    return this.debugService.setAllAppUpdateAvailable();
  }

  @UseGuards(AuthGuard)
  @UseGuards(DebugGuard)
  @Post('set-all-subnets-to-null')
  async setAllAppSubnetToNull() {
    return this.debugService.setAllSubnetsToNull();
  }

  @UseGuards(AuthGuard)
  @UseGuards(DebugGuard)
  @Post('start-all-apps')
  async startAllApps() {
    return this.debugService.startAllApps();
  }

  @UseGuards(AuthGuard)
  @UseGuards(DebugGuard)
  @Post('backup-all-apps')
  async backupAllApps() {
    return this.debugService.backupAllApps();
  }

  @UseGuards(AuthGuard)
  @UseGuards(DebugGuard)
  @Post('increment-all-app-versions')
  async incrementAllAppVersions() {
    return this.debugService.incrementAllAppVersions();
  }

  @UseGuards(AuthGuard)
  @UseGuards(DebugGuard)
  @Post('uninstall-all-apps')
  async uninstallAllApps() {
    return this.debugService.uninstallAllApps();
  }
}
