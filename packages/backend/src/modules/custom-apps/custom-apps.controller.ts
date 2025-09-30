import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CustomAppService } from './custom-apps.service';
import { CreateCustomAppDto, CreateCustomAppResponseDto, UpdateCustomAppDto } from './dto/custom-apps.dto';
import { ApiResponse } from '@nestjs/swagger';
import { castAppUrn } from '@/common/helpers/app-helpers';

@Controller('custom-apps')
export class CustomAppController {
  constructor(private readonly customAppService: CustomAppService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiResponse({ type: CreateCustomAppResponseDto })
  async createCustomApp(@Body() body: CreateCustomAppDto) {
    const result = await this.customAppService.createCustomApp(body);
    return CreateCustomAppResponseDto.parse(
      {
        appUrn: result.appUrn,
        appName: result.appName,
        storeId: result.storeId,
      },
      { reportOnly: true },
    );
  }

  @Patch(':urn')
  @UseGuards(AuthGuard)
  @ApiResponse({})
  async updateCustomApp(@Param('urn') appUrn: string, @Body() body: UpdateCustomAppDto) {
    return await this.customAppService.updateCustomApp(castAppUrn(appUrn), body.config);
  }
}
