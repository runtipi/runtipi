import { Body, Controller, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { CustomAppService } from './custom-apps.service';
import { CreateCustomAppDto, CreateCustomAppResponseDto, UpdateAppMetadataDto, UpdateCustomAppDto } from './dto/custom-apps.dto';
import { ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
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

  @Post(':urn/image')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Logo uploaded successfully' })
  async uploadAppImage(@Param('urn') appUrn: string, @UploadedFile() file?: { buffer: Buffer; mimetype: string }) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/jpg') {
      throw new BadRequestException('Only JPG files are allowed');
    }

    await this.customAppService.uploadAppImage(castAppUrn(appUrn), file.buffer);
    return { success: true };
  }

  @Patch(':urn/metadata')
  @UseGuards(AuthGuard)
  @ApiResponse({})
  async updateAppMetadata(@Param('urn') appUrn: string, @Body() body: UpdateAppMetadataDto) {
    return await this.customAppService.updateAppMetadata(castAppUrn(appUrn), body.data);
  }
}
