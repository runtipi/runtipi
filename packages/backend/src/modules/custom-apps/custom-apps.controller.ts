import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CustomAppService } from './custom-apps.service';
import { CreateCustomAppDto, CreateCustomAppResponseDto, GetCustomAppDto, GetCustomAppsResponseDto } from './dto/custom-apps.dto';

@Controller('custom-apps')
export class CustomAppController {
  constructor(private readonly customAppService: CustomAppService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ZodSerializerDto(CreateCustomAppResponseDto)
  async createCustomApp(@Body() body: CreateCustomAppDto): Promise<CreateCustomAppResponseDto> {
    const result = await this.customAppService.createCustomApp(body);
    return {
      appUrn: result.appUrn,
      appName: result.appName,
      storeId: result.storeId,
    };
  }

  @Get()
  @UseGuards(AuthGuard)
  @ZodSerializerDto(GetCustomAppsResponseDto)
  async getCustomApps(): Promise<GetCustomAppsResponseDto> {
    const result = await this.customAppService.getCustomApps();
    return { apps: result };
  }

  @Get(':appid')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(GetCustomAppDto)
  async getCustomAppById(@Param('appid') id: string): Promise<GetCustomAppDto> {
    return this.customAppService.getCustomAppById(id);
  }
}
