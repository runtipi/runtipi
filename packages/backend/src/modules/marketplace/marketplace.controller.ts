import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { AppStoreService } from '../app-stores/app-store.service';
import { AuthGuard } from '../auth/auth.guard';
import {
  APP_CATEGORIES,
  AllAppStoresDto,
  AppDetailsDto,
  CreateAppStoreBodyDto,
  PullDto,
  SearchAppsDto,
  SearchAppsQueryDto,
  UpdateAppStoreBodyDto,
} from './dto/marketplace.dto';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly appStoreService: AppStoreService,
  ) {}

  @Get('apps/search')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(SearchAppsDto)
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'pageSize', type: Number, required: false })
  @ApiQuery({ name: 'cursor', type: String, required: false })
  @ApiQuery({ name: 'category', required: false, enum: APP_CATEGORIES })
  async searchApps(@Query() query: SearchAppsQueryDto): Promise<SearchAppsDto> {
    const { search, pageSize, cursor, category } = query;

    const size = pageSize ? Number(pageSize) : 24;
    if (Number.isNaN(size) || size <= 0) {
      throw new BadRequestException('Invalid pageSize');
    }
    const res = await this.marketplaceService.searchApps({ search, pageSize: size, cursor, category });

    return res;
  }

  @Get('apps/:id')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(AppDetailsDto)
  async getAppDetails(@Param('id') id: string): Promise<AppDetailsDto> {
    const res = await this.marketplaceService.getAppDetails(id);

    return res;
  }

  @Get('apps/:id/image')
  async getImage(@Param('id') id: string, @Res() res: Response) {
    const image = await this.marketplaceService.getAppImage(id);

    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    });

    return res.send(image);
  }

  @Post('pull')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(PullDto)
  async pullAppStore(): Promise<PullDto> {
    return this.appStoreService.pullRepositories();
  }

  @Post('create')
  @UseGuards(AuthGuard)
  async createAppStore(@Body() body: CreateAppStoreBodyDto) {
    await this.appStoreService.createAppStore(body);
    await this.marketplaceService.initialize();
  }

  @Get('all')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(AllAppStoresDto)
  async getAllAppStores(): Promise<AllAppStoresDto> {
    const appStores = await this.appStoreService.getEnabledAppStores();

    return { appStores };
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async updateAppStore(@Param('id') id: string, @Body() body: UpdateAppStoreBodyDto) {
    await this.appStoreService.updateAppStore(id, body);
    await this.marketplaceService.initialize();
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteAppStore(@Param('id') id: string) {
    await this.appStoreService.deleteAppStore(id);
    await this.marketplaceService.initialize();
  }
}
