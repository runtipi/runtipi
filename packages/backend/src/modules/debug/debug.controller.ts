import { Controller, ForbiddenException, Post } from '@nestjs/common';
import { DebugService } from './debug.service';
import { ConfigurationService } from '@/core/config/configuration.service';

@Controller('debug')
export class DebugController {
  constructor(
    private readonly debugService: DebugService,
    private readonly config: ConfigurationService,
  ) {}

  @Post('seed')
  async seedDatabase() {
    if (this.config.get('__prod__')) {
      throw new ForbiddenException('Seeding the database is not allowed in production mode.');
    }

    return this.debugService.seedDatabase();
  }

  @Post('set-all-app-update-available')
  async setAllAppUpdateAvailable() {
    if (this.config.get('__prod__')) {
      throw new ForbiddenException('Setting all apps to update available is not allowed in production mode.');
    }

    return this.debugService.setAllAppUpdateAvailable();
  }

  @Post('set-all-subnets-to-null')
  async setAllAppSubnetToNull() {
    if (this.config.get('__prod__')) {
      throw new ForbiddenException('Setting all subnets to null is not allowed in production mode.');
    }

    return this.debugService.setAllSubnetsToNull();
  }

  @Post('restart-all-apps')
  async restartAllApps() {
    if (this.config.get('__prod__')) {
      throw new ForbiddenException('Starting all apps is not allowed in production mode.');
    }

    return this.debugService.restartAllApps();
  }

  @Post('backup-all-apps')
  async backupAllApps() {
    if (this.config.get('__prod__')) {
      throw new ForbiddenException('Backing up all apps is not allowed in production mode.');
    }

    return this.debugService.backupAllApps();
  }
}
