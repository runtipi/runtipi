import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { APP_CATEGORIES, AppDetailsDto, SearchAppsDto, SearchAppsQueryDto } from './dto/marketplace.dto';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('search')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(SearchAppsDto)
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'pageSize', type: Number, required: false })
  @ApiQuery({ name: 'cursor', type: String, required: false })
  @ApiQuery({ name: 'category', required: false, enum: APP_CATEGORIES })
  async searchApps(@Query() query: SearchAppsQueryDto): Promise<SearchAppsDto> {
    const { search, pageSize, cursor, category } = query;

    const res = await this.marketplaceService.searchApps({ search, pageSize: Number(pageSize), cursor, category });

    return res;
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(AppDetailsDto)
  async getAppDetails(@Param('id') id: string): Promise<AppDetailsDto> {
    const res = await this.marketplaceService.getAppDetails(id);

    return res;
  }

  @Get(':id/image')
  async getImage(@Param('id') id: string, @Res() res: Response) {
    const image = await this.marketplaceService.getAppImage(id);

    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    });

    return res.send(image);
  }
}
