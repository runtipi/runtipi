import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { CustomAppService } from './custom-apps.service';
import { CreateCustomAppDto, CreateCustomAppResponseDto } from './dto/custom-apps.dto';

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
}
