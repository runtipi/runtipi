import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/modules/auth/auth.guard';
import type { AppUrn } from '@runtipi/common/types';
import { type } from 'arktype';
import { AppConfigService } from './app-config.service';
import { updateAppConfigSchema } from './dto/app-config.dto';

@Controller('apps')
@UseGuards(AuthGuard)
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Get(':urn/config')
  async getAppConfig(@Param('urn') appUrn: AppUrn) {
    const config = await this.appConfigService.getAppConfig(appUrn);
    return { config };
  }

  @Post(':urn/config')
  async updateAppConfig(@Param('urn') appUrn: AppUrn, @Body() body: { config: string }) {
    const parsed = updateAppConfigSchema(body);
    if (parsed instanceof type.errors) {
      throw new HttpException(`Invalid config: ${parsed.summary}`, HttpStatus.BAD_REQUEST);
    }
    await this.appConfigService.updateAppConfig(appUrn, parsed);
    return { success: true };
  }

  @Get(':urn/template/diff')
  async getTemplateDiff(@Param('urn') appUrn: AppUrn) {
    const diff = await this.appConfigService.getTemplateDiff(appUrn);
    return diff;
  }

  @Post(':urn/template/sync')
  async syncWithTemplate(@Param('urn') appUrn: AppUrn) {
    await this.appConfigService.syncWithTemplate(appUrn);
    return { success: true };
  }
}
