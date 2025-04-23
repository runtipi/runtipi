import { castAppUrn } from '@/common/helpers/app-helpers';
import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { AppStoreService } from '../app-stores/app-store.service';
import { AuthGuard } from '../auth/auth.guard';
import {
  APP_CATEGORIES,
  AllAppStoresDto,
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
  @ApiQuery({ name: 'storeId', type: String, required: false })
  async searchApps(@Query() query: SearchAppsQueryDto): Promise<SearchAppsDto> {
    const { search, pageSize, cursor, category, storeId } = query;

    const size = pageSize ? Number(pageSize) : 24;
    if (Number.isNaN(size) || size <= 0) {
      throw new BadRequestException('Invalid pageSize');
    }
    const res = await this.marketplaceService.searchApps({ search, pageSize: size, cursor, category, storeId });

    return res;
  }

  @Get('apps/:urn/image')
  async getImage(@Param('urn') urn: string, @Res() res: Response) {
    const image = await this.marketplaceService.getAppImage(castAppUrn(urn));

    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    });

    return res.send(image);
  }

  @Post('pull')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(PullDto)
  async pullAppStores(): Promise<PullDto> {
    const res = await this.appStoreService.pullRepositories();
    await this.marketplaceService.initialize();
    return res;
  }

  @Post('create')
  @UseGuards(AuthGuard)
  async createAppStore(@Body() body: CreateAppStoreBodyDto) {
    const appStore = await this.appStoreService.createAppStore(body);
    await this.marketplaceService.initialize();

    return { appStore };
  }

  @Get('all')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(AllAppStoresDto)
  async getAllAppStores(): Promise<AllAppStoresDto> {
    const appStores = await this.appStoreService.getAllAppStores();

    return { appStores };
  }

  @Get('enabled')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(AllAppStoresDto)
  async getEnabledAppStores(): Promise<AllAppStoresDto> {
    const appStores = await this.appStoreService.getEnabledAppStores();

    return { appStores };
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async updateAppStore(@Param('id') id: string, @Body() body: UpdateAppStoreBodyDto) {
    await this.appStoreService.updateAppStore(id, body);
    await this.marketplaceService.initialize();

    return { success: true };
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteAppStore(@Param('id') id: string) {
    await this.appStoreService.deleteAppStore(id);
    await this.marketplaceService.initialize();

    return { success: true };
  }
}
