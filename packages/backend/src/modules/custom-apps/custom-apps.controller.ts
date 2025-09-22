import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CustomAppService } from './custom-apps.service';
import { CreateCustomAppDto, CreateCustomAppResponseDto } from './dto/custom-apps.dto';
import { ApiResponse } from '@nestjs/swagger';

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
}
