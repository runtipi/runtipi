import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/modules/auth/auth.guard';
import { castAppUrn } from '@/common/helpers/app-helpers';
import { type } from 'arktype';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { AppConfigService } from './app-config.service';
import { AppConfigSuccessDto, GetAppConfigDto, TemplateDiffDto, UpdateAppConfigBodyDto, updateAppConfigSchema } from './dto/app-config.dto';

@Controller('apps')
@UseGuards(AuthGuard)
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Get(':urn/config')
  @ApiOperation({ operationId: 'getEditableAppConfig' })
  @ApiParam({ name: 'urn', type: String })
  @ApiResponse({ type: GetAppConfigDto })
  async getAppConfig(@Param('urn') appUrn: string) {
    const config = await this.appConfigService.getAppConfig(castAppUrn(appUrn));
    return GetAppConfigDto.parse({ config }, { reportOnly: true });
  }

  @Post(':urn/config')
  @ApiOperation({ operationId: 'updateEditableAppConfig' })
  @ApiParam({ name: 'urn', type: String })
  @ApiBody({ type: UpdateAppConfigBodyDto })
  @ApiResponse({ type: AppConfigSuccessDto })
  async updateAppConfig(@Param('urn') appUrn: string, @Body() body: UpdateAppConfigBodyDto) {
    const parsed = updateAppConfigSchema(body);
    if (parsed instanceof type.errors) {
      throw new HttpException(`Invalid config: ${parsed.summary}`, HttpStatus.BAD_REQUEST);
    }
    await this.appConfigService.updateAppConfig(castAppUrn(appUrn), parsed);
    return AppConfigSuccessDto.parse({ success: true }, { reportOnly: true });
  }

  @Get(':urn/template/diff')
  @ApiOperation({ operationId: 'getTemplateDiff' })
  @ApiParam({ name: 'urn', type: String })
  @ApiResponse({ type: TemplateDiffDto })
  async getTemplateDiff(@Param('urn') appUrn: string) {
    const diff = await this.appConfigService.getTemplateDiff(castAppUrn(appUrn));
    return TemplateDiffDto.parse(diff, { reportOnly: true });
  }

  @Post(':urn/template/sync')
  @ApiOperation({ operationId: 'syncWithTemplate' })
  @ApiParam({ name: 'urn', type: String })
  @ApiResponse({ type: AppConfigSuccessDto })
  async syncWithTemplate(@Param('urn') appUrn: string) {
    await this.appConfigService.syncWithTemplate(castAppUrn(appUrn));
    return AppConfigSuccessDto.parse({ success: true }, { reportOnly: true });
  }
}
